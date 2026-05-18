/**
 * 主应用组件 - 简洁的布局结构
 */
import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PageHeader } from './components/PageHeader';
import { CalculatorView, MaterialsView, RecipesView, ProcessesView, HistoryView } from './views';
import { UserSettingsView } from './UserSettingsView';
import { cn } from './utils/utils';
import { getMaterials, getRecipes, getHistory, saveRecipes, getProcesses } from './utils/storage';
import { getUserDataFromDB, getAdminData } from './utils/adminData';
import { getPinyin } from './types';
import { supabase } from './utils/supabase';
import { TabType } from './config/tabs';

// 深色主题（固定）
const isDark = true;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [materials, setMaterials] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const localMaterials = getMaterials();
    let localRecipes = getRecipes();
    const localHistory = getHistory();
    const localProcesses = getProcesses();

    // 迁移：始终根据最新映射表重新计算 pinyin
    localRecipes = localRecipes.map((recipe: any) => ({
      ...recipe,
      pinyin: getPinyin(recipe.name)
    }));
    saveRecipes(localRecipes);

    // 检查是否登录
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (currentUserId) {
      const userData = await getUserDataFromDB(currentUserId);
      const migratedRecipes = userData.recipes.map((recipe: any) => ({
        ...recipe,
        pinyin: getPinyin(recipe.name)
      }));
      setMaterials(userData.materials);
      setRecipes(migratedRecipes);
      setProcesses(localProcesses);
      setHistory(localHistory);
      setIsReadOnly(false);
      return;
    }

    // 未登录用户：使用本地数据或 admin 数据
    if (localMaterials.length === 0 && localRecipes.length === 0) {
      const adminData = await getAdminData();
      if (adminData.materials.length > 0 || adminData.recipes.length > 0) {
        const migratedRecipes = adminData.recipes.map((recipe: any) => ({
          ...recipe,
          pinyin: getPinyin(recipe.name)
        }));
        setMaterials(adminData.materials);
        setRecipes(migratedRecipes);
        setProcesses(localProcesses);
        setHistory(localHistory);
        setIsReadOnly(true);
        return;
      }
    }

    setMaterials(localMaterials);
    setRecipes(localRecipes);
    setProcesses(localProcesses);
    setHistory(localHistory);
  };

  const refreshData = async () => {
    const localHistory = getHistory();
    const localProcesses = getProcesses();

    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (currentUserId) {
      const userData = await getUserDataFromDB(currentUserId);
      setMaterials(userData.materials);
      setRecipes(userData.recipes);
      setProcesses(localProcesses);
      setHistory(localHistory);
      setIsReadOnly(false);
      return;
    }

    const localMaterials = getMaterials();
    const localRecipes = getRecipes();

    if (localMaterials.length > 0 || localRecipes.length > 0) {
      setIsReadOnly(false);
    }

    setMaterials(localMaterials);
    setRecipes(localRecipes);
    setProcesses(localProcesses);
    setHistory(localHistory);
  };

  return (
    <div className={cn("flex min-h-screen", isDark ? "bg-[#0a0a12]" : "bg-gray-100")}>
      {/* 侧边栏 */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* 主内容区 */}
      <main className="flex-1 ml-60 min-h-screen overflow-auto">
        {/* 页面标题 */}
        <PageHeader activeTab={activeTab} />

        <div className="p-8 max-w-6xl">
          {activeTab === 'calculator' && (
            <CalculatorView
              materials={materials}
              recipes={recipes}
              onCalculated={refreshData}
            />
          )}
          {activeTab === 'materials' && (
            <MaterialsView
              materials={materials}
              onMaterialsChange={refreshData}
              isReadOnly={isReadOnly}
            />
          )}
          {activeTab === 'recipes' && (
            <RecipesView
              materials={materials}
              recipes={recipes}
              onRecipesChange={refreshData}
              isReadOnly={isReadOnly}
            />
          )}
          {activeTab === 'processes' && (
            <ProcessesView
              processes={processes}
              onProcessesChange={refreshData}
              isReadOnly={isReadOnly}
            />
          )}
          {activeTab === 'history' && (
            <HistoryView
              history={history}
              onHistoryChange={refreshData}
            />
          )}
          {activeTab === 'settings' && (
            <UserSettingsView isDark={isDark} />
          )}
        </div>
      </main>
    </div>
  );
}
