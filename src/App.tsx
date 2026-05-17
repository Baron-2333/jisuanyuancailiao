import { useState, useEffect, useCallback } from 'react';
import { Calculator, Package, BookOpen, History, Plus, Trash2, Edit2, Save, X, Download, RefreshCw, ChevronRight, Sun, Moon, Cog, LogOut, LogIn, Loader2, Lock, Search } from 'lucide-react';
import { cn } from './utils/utils';
import { getMaterials, getRecipes, getHistory, saveMaterials, saveRecipes, addMaterial, addRecipe, deleteMaterial, deleteRecipe, updateMaterial, updateRecipe, clearHistory, deleteHistoryItem, generateId, getSavedCalculation, saveCalculation, removeIngredientFromRecipe, getProcessSteps, addProcessStep, updateProcessStep, deleteProcessStep, getTraceableMaterials, addTraceableMaterial, removeTraceableMaterial } from './utils/storage';
import { performCalculation, exportToCSV, downloadCSV, calculateRequirements, TargetConfig, calculateExpandedRequirements, ExpandedRequirement, setSaveHistory } from './utils/calculator';
import { Material, Recipe, CalculationHistory, MaterialRequirement, RecipeIngredient, ProcessStep, TraceableMaterial } from './types';
import { loginWithEmail, logout, getCurrentUser } from './utils/auth';

// 配方的产物/材料类型
type IngredientType = 'raw' | 'processed' | 'recipe';

// 可选的配方产物（用于选择）
interface RecipeProduct {
  id: string;
  name: string;
  type: IngredientType;
  recipeId?: string;
}

// Tab类型
type TabType = 'calculator' | 'materials' | 'processes' | 'recipes' | 'trace' | 'history';

// 单个目标材料配置
interface TargetMaterial {
  id: string;
  recipeId: string;
  quantity: number;
}

// 保存的计算状态
interface SavedCalculation {
  targets: TargetMaterial[];
  results: MaterialRequirement[];
  summary: string;
}

// Tab配置
const tabs = [
  { id: 'calculator' as TabType, label: '配方计算', icon: Calculator },
  { id: 'materials' as TabType, label: '原材料管理', icon: Package },
  { id: 'processes' as TabType, label: '加工步骤', icon: Cog },
  { id: 'recipes' as TabType, label: '配方管理', icon: BookOpen },
  { id: 'trace' as TabType, label: '溯源', icon: Search },
  { id: 'history' as TabType, label: '历史记录', icon: History },
];

// 深色主题
const isDark = true;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [savedCalc, setSavedCalc] = useState<SavedCalculation | null>(null);
  
  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = 加载中
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false); // 登录弹窗

  // 检查登录状态
  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const user = await getCurrentUser();
      setIsLoggedIn(!!user);
    } catch (e) {
      setIsLoggedIn(false);
    }
  };

  // 登录处理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    
    const result = await loginWithEmail(loginEmail, loginPassword);
    
    if (result.success) {
      setIsLoggedIn(true);
      setLoginEmail('');
      setLoginPassword('');
    } else {
      setLoginError(result.error || '登录失败');
    }
    setLoginLoading(false);
  };

  // 登出处理
  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
  };

  // 加载数据
  useEffect(() => {
    // 配方和原材料数据始终加载（未登录用户也需要使用配方计算）
    setMaterials(getMaterials());
    setProcessSteps(getProcessSteps());
    setRecipes(getRecipes());
    
    // 只有登录用户才加载历史记录
    if (isLoggedIn) {
      setHistory(getHistory());
      const saved = getSavedCalculation();
      if (saved) setSavedCalc(saved);
    }
  }, [isLoggedIn]);

  // 刷新数据
  const refreshData = useCallback(() => {
    setMaterials(getMaterials());
    setProcessSteps(getProcessSteps());
    setRecipes(getRecipes());
    // 只有登录用户才刷新历史记录
    if (isLoggedIn) {
      setHistory(getHistory());
    }
  }, [isLoggedIn]);

  // 保存计算状态
  const handleSaveCalculation = useCallback((targets: TargetMaterial[], results: MaterialRequirement[]) => {
    const summary = targets.filter(t => t.recipeId).map(t => {
      const recipe = recipes.find(r => r.id === t.recipeId);
      return `${recipe?.name || ''}×${t.quantity}`;
    }).join(' + ');
    
    const saved: SavedCalculation = { targets, results, summary };
    saveCalculation(saved);
    setSavedCalc(saved);
  }, [recipes]);

  return (
    <div className={cn("min-h-screen", isDark ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100")}>
      {/* 加载中 */}
      {isLoggedIn === null && (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin text-blue-500" size={48} />
        </div>
      )}

      {/* 未登录 - 主界面（仅配方计算可用） */}
      {isLoggedIn === false && (
        <>
          {/* Header */}
          <header className={cn("shadow-sm border-b backdrop-blur-xl", isDark ? "bg-slate-900/70 border-slate-700/50" : "bg-white/70 border-gray-200/50")}>
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
              <div>
                <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-800")}>原材料计算器 <span className="text-xs text-slate-500 ml-1">v0.0.38</span></h1>
                <p className={cn("text-base mt-1", isDark ? "text-slate-400" : "text-gray-500")}>工业配方材料需求计算系统</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn("text-xs", isDark ? "text-slate-500" : "text-gray-400")}>本网站代码100%由AI生成</span>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                    isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  <LogIn size={16} />
                  登录
                </button>
              </div>
            </div>
          </header>

          {/* Navigation Tabs - 未登录用户可见但部分禁用 */}
          <nav className={cn("border-b sticky top-0 z-10 backdrop-blur-xl", isDark ? "bg-slate-900/70 border-slate-700/50" : "bg-white/70 border-gray-200/50")}>
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex gap-1">
                {tabs.map(tab => {
                  const isLocked = tab.id !== 'calculator';
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (isLocked) {
                          setShowLoginModal(true);
                        } else {
                          setActiveTab(tab.id);
                        }
                      }}
                      className={cn(
                        'flex items-center gap-2 px-5 py-4 text-base font-medium border-b-2 transition-colors',
                        activeTab === tab.id
                          ? isDark ? "border-blue-400 text-blue-400" : "border-blue-600 text-blue-600"
                          : isLocked
                            ? isDark ? "border-transparent text-slate-600 cursor-not-allowed" : "border-transparent text-gray-400 cursor-not-allowed"
                            : isDark ? "border-transparent text-slate-400 hover:text-white" : "border-transparent text-gray-600 hover:text-gray-800"
                      )}
                      title={isLocked ? '登录后可访问' : tab.label}
                    >
                      {isLocked && <Lock size={16} className="opacity-50" />}
                      <tab.icon size={20} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Content - 未登录只显示配方计算 */}
          <main className="max-w-6xl mx-auto px-4 py-6">
            <CalculatorView 
              materials={materials} 
              recipes={recipes}
              savedCalc={savedCalc}
              onCalculated={refreshData}
              onSave={handleSaveCalculation}
              isDark={isDark}
              isGuestMode={true}
              onShowLogin={() => setShowLoginModal(true)}
            />
          </main>

          {/* 登录弹窗 */}
          {showLoginModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLoginModal(false)}>
              <div 
                className={cn("w-full max-w-md rounded-2xl p-8 backdrop-blur-xl", isDark ? "bg-slate-800/95 border border-slate-700/50" : "bg-white/95 border border-gray-200/50 shadow-xl")} 
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className={cn("text-xl font-bold", isDark ? "text-white" : "text-gray-800")}>登录</h2>
                  <button 
                    onClick={() => setShowLoginModal(false)}
                    className={cn("p-2 rounded-lg", isDark ? "text-slate-400 hover:bg-slate-700" : "text-gray-500 hover:bg-gray-100")}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className={cn("block text-sm font-medium mb-2", isDark ? "text-slate-300" : "text-gray-700")}>
                      用户名/邮箱
                    </label>
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className={cn("w-full px-4 py-3 rounded-lg text-base", 
                        isDark ? "bg-slate-700/80 text-white border-slate-600 placeholder-slate-400" : "border border-gray-300"
                      )}
                      placeholder="请输入用户名或邮箱"
                      disabled={loginLoading}
                    />
                  </div>

                  <div>
                    <label className={cn("block text-sm font-medium mb-2", isDark ? "text-slate-300" : "text-gray-700")}>
                      密码
                    </label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className={cn("w-full px-4 py-3 rounded-lg text-base", 
                        isDark ? "bg-slate-700/80 text-white border-slate-600 placeholder-slate-400" : "border border-gray-300"
                      )}
                      placeholder="请输入密码"
                      disabled={loginLoading}
                    />
                  </div>

                  {loginError && (
                    <div className={cn("p-3 rounded-lg text-sm text-center", isDark ? "bg-red-900/50 text-red-300" : "bg-red-50 text-red-600")}>
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className={cn(
                      "w-full py-3 rounded-lg text-base font-medium flex items-center justify-center gap-2",
                      isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white",
                      loginLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {loginLoading && <Loader2 className="animate-spin" size={20} />}
                    {loginLoading ? '登录中...' : '登录'}
                  </button>
                </form>

                <p className={cn("text-center text-sm mt-6", isDark ? "text-slate-500" : "text-gray-400")}>
                  登录后可访问全部功能
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* 已登录 - 主界面 */}
      {isLoggedIn === true && (
        <>
          {/* Header */}
          <header className={cn("shadow-sm border-b backdrop-blur-xl", isDark ? "bg-slate-900/70 border-slate-700/50" : "bg-white/70 border-gray-200/50")}>
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
              <div>
                <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-800")}>原材料计算器 <span className="text-xs text-slate-500 ml-1">v0.0.38</span></h1>
                <p className={cn("text-base mt-1", isDark ? "text-slate-400" : "text-gray-500")}>工业配方材料需求计算系统</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn("text-xs", isDark ? "text-slate-500" : "text-gray-400")}>本网站代码100%由AI生成</span>
                <button
                  onClick={handleLogout}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm",
                    isDark ? "bg-slate-700/80 hover:bg-slate-600 text-slate-300" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  )}
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            </div>
          </header>

          {/* Navigation Tabs */}
          <nav className={cn("border-b sticky top-0 z-10 backdrop-blur-xl", isDark ? "bg-slate-900/70 border-slate-700/50" : "bg-white/70 border-gray-200/50")}>
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex gap-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-4 text-base font-medium border-b-2 transition-colors',
                      activeTab === tab.id
                        ? isDark ? "border-blue-400 text-blue-400" : "border-blue-600 text-blue-600"
                        : isDark ? "border-transparent text-slate-400 hover:text-white" : "border-transparent text-gray-600 hover:text-gray-800"
                    )}
                  >
                    <tab.icon size={20} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'calculator' && (
          <CalculatorView 
            materials={materials} 
            recipes={recipes}
            savedCalc={savedCalc}
            onCalculated={refreshData}
            onSave={handleSaveCalculation}
            isDark={isDark}
          />
        )}
        {activeTab === 'materials' && (
          <MaterialsView 
            materials={materials} 
            onMaterialsChange={refreshData}
            isDark={isDark}
          />
        )}
        {activeTab === 'processes' && (
          <ProcessStepsView 
            materials={materials}
            processSteps={processSteps}
            onProcessStepsChange={refreshData}
            isDark={isDark}
          />
        )}
        {activeTab === 'recipes' && (
          <RecipesView 
            materials={materials}
            recipes={recipes}
            processSteps={processSteps}
            onRecipesChange={refreshData}
            isDark={isDark}
          />
        )}
        {activeTab === 'history' && (
          <HistoryView 
            history={history}
            recipes={recipes}
            onHistoryChange={refreshData}
            isDark={isDark}
          />
        )}
        {activeTab === 'trace' && (
          <TraceView 
            materials={materials}
            processSteps={processSteps}
            isDark={isDark}
          />
        )}
      </main>
        </>
      )}
    </div>
  );
}

// ============ 配方计算视图 ============
function CalculatorView({ materials, recipes, savedCalc, onCalculated, onSave, isDark, isGuestMode = false, onShowLogin }: { 
  materials: Material[]; 
  recipes: Recipe[];
  savedCalc: SavedCalculation | null;
  onCalculated: () => void;
  onSave: (targets: TargetMaterial[], results: MaterialRequirement[]) => void;
  isDark: boolean;
  isGuestMode?: boolean;
  onShowLogin?: () => void;
}) {
  const [targets, setTargets] = useState<TargetMaterial[]>(
    savedCalc?.targets?.length ? savedCalc.targets : [{ id: '1', recipeId: '', quantity: 1 }]
  );
  const [results, setResults] = useState<MaterialRequirement[]>(savedCalc?.results || []);
  const [expandedResults, setExpandedResults] = useState<ExpandedRequirement[]>([]);
  const [showResults, setShowResults] = useState(savedCalc?.results?.length > 0);
  const [expandSubRecipes, setExpandSubRecipes] = useState(true); // 是否展开子配方
  const [traceNotes, setTraceNotes] = useState<Map<string, string>>(new Map()); // 溯源备注
  // 单个配方的预览结果
  const [previewResults, setPreviewResults] = useState<Map<string, MaterialRequirement[]>>(new Map());
  // 溯源配置
  const [traceableMaterials] = useState<TraceableMaterial[]>(getTraceableMaterials());

  // 添加一个目标材料
  const addTarget = () => {
    setTargets([...targets, { 
      id: Date.now().toString(), 
      recipeId: '', 
      quantity: 1 
    }]);
  };

  // 移除一个目标材料
  const removeTarget = (id: string) => {
    const newTargets = targets.filter(t => t.id !== id);
    if (newTargets.length === 0) {
      newTargets.push({ id: Date.now().toString(), recipeId: '', quantity: 1 });
    }
    setTargets(newTargets);
    updatePreview(newTargets);
  };

  // 更新目标材料
  const updateTarget = (id: string, field: 'recipeId' | 'quantity', value: string | number) => {
    const newTargets = targets.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    );
    setTargets(newTargets);
    updatePreview(newTargets);
  };

  // 更新单个配方的预览
  const updatePreview = (currentTargets: TargetMaterial[]) => {
    const previews = new Map<string, MaterialRequirement[]>();
    for (const t of currentTargets) {
      if (t.recipeId) {
        if (expandSubRecipes) {
          const reqs = calculateExpandedRequirements(t.recipeId, t.quantity, recipes, materials);
          previews.set(t.id, reqs.map(r => ({
            materialId: r.materialId,
            materialName: r.materialName,
            totalQuantity: r.quantity,
            unit: r.unit,
          })));
        } else {
          const reqs = calculateRequirements(t.recipeId, t.quantity, recipes, materials);
          previews.set(t.id, reqs);
        }
      }
    }
    setPreviewResults(previews);
  };

  // 切换展开子配方
  const toggleExpand = (expand: boolean) => {
    setExpandSubRecipes(expand);
    updatePreview(targets);
  };

  // 初始加载时更新预览
  useEffect(() => {
    updatePreview(targets);
  }, []);

  // 计算所有目标材料的总需求
  const handleCalculate = () => {
    const validTargets = targets.filter(t => t.recipeId && t.quantity > 0);
    if (validTargets.length === 0) return;

    const configs: TargetConfig[] = validTargets.map(t => ({
      recipeId: t.recipeId,
      quantity: t.quantity,
    }));

    // 设置是否保存历史记录（访客模式不保存）
    setSaveHistory(!isGuestMode);

    const result = performCalculation(configs, expandSubRecipes);
    if (result) {
      setResults(result.results);
      setExpandedResults(result.expandedResults || []);
      setTraceNotes(result.traceNotes || new Map());
      setShowResults(true);
      // 访客模式不保存计算状态
      if (!isGuestMode) {
        onCalculated();
        onSave(targets, result.results);
      }
    }
  };

  // 格式化数量显示
  const formatQuantity = (qty: number): string => {
    if (qty <= 64) return qty.toString();
    const largePack = 64;
    const fullPacks = Math.floor(qty / largePack);
    const remainder = qty % largePack;
    if (remainder === 0) return `${fullPacks}包`;
    return `${qty}(${fullPacks}+${remainder})`;
  };

  // 获取配方名称
  const getRecipeName = (recipeId: string): string => {
    return recipes.find(r => r.id === recipeId)?.name || '';
  };

  const handleReset = () => {
    setTargets([{ id: '1', recipeId: '', quantity: 1 }]);
    setResults([]);
    setExpandedResults([]);
    setShowResults(false);
    setPreviewResults(new Map());
    // 访客模式不保存重置状态
    if (!isGuestMode) {
      onSave([], []);
    }
  };

  const handleExport = () => {
    const csvContent = [
      '原材料名称,总需求量,单位,加工步骤',
      ...results.map((r, i) => {
        const steps = expandedResults[i]?.steps || [];
        const stepsStr = steps.map(s => `${s.recipeName}×${s.quantity}`).join(' → ') || '-';
        return `${r.materialName},${r.totalQuantity},${r.unit},"${stepsStr}"`;
      })
    ].join('\n');
    downloadCSV(csvContent, `原材料需求汇总_${Date.now()}.csv`);
  };

  const cardClass = cn("rounded-xl p-6 backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className="space-y-5">
      {/* 访客模式提示 */}
      {isGuestMode && (
        <div className={cn("rounded-xl p-4 flex items-center justify-between", isDark ? "bg-amber-900/30 border border-amber-700/50" : "bg-amber-50 border border-amber-200")}>
          <div className="flex items-center gap-3">
            <Lock className={isDark ? "text-amber-400" : "text-amber-600"} size={20} />
            <div>
              <p className={cn("font-medium", isDark ? "text-amber-300" : "text-amber-800")}>当前为访客模式</p>
              <p className={cn("text-sm", isDark ? "text-amber-400/70" : "text-amber-600")}>计算结果不会保存，登录后可解锁全部功能</p>
            </div>
          </div>
          <button
            onClick={onShowLogin}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
              isDark ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white"
            )}
          >
            <LogIn size={16} />
            登录
          </button>
        </div>
      )}

      {/* 多目标材料输入 */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-800")}>配方计算</h2>
          <button
            onClick={addTarget}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              isDark ? "text-blue-400 border border-blue-400 hover:bg-slate-700" : "text-blue-600 border border-blue-600 hover:bg-blue-50"
            )}
          >
            <Plus size={16} />
            添加
          </button>
        </div>
        
        {/* 目标材料列表 - 每个目标材料紧跟预览表格 */}
        <div className="space-y-3">
          {targets.map((target, index) => {
            const recipe = recipes.find(r => r.id === target.recipeId);
            
            return (
              <div key={target.id}>
                {/* 选择行 */}
                <div className={cn("flex gap-3 items-end p-3 rounded-lg mb-2", isDark ? "bg-slate-700" : "bg-gray-50")}>
                  <div className="flex items-center gap-2 text-slate-400 w-8">
                    <span className="font-medium text-sm">{index + 1}.</span>
                  </div>
                  <div className="flex-1">
                    <select
                      value={target.recipeId}
                      onChange={e => updateTarget(target.id, 'recipeId', e.target.value)}
                      className={cn("w-full px-3 py-2 rounded-lg text-sm", 
                        isDark ? "bg-slate-600 text-white border-slate-500" : "bg-white border-gray-300"
                      )}
                    >
                      <option value="">选择配方...</option>
                      {recipes.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name} ({recipe.ingredients.length}种)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={target.quantity}
                      onChange={e => updateTarget(target.id, 'quantity', parseInt(e.target.value) || 1)}
                      className={cn("w-full px-3 py-2 rounded-lg text-sm text-center", 
                        isDark ? "bg-slate-600 text-white border-slate-500" : "bg-white border-gray-300"
                      )}
                    />
                  </div>
                  <button
                    onClick={() => removeTarget(target.id)}
                    className={cn(
                      'p-2 rounded-lg',
                      isDark ? "text-red-400 hover:bg-slate-600" : "text-red-600 hover:bg-red-50"
                    )}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {/* 预览表格 - 紧跟在选择行后面 */}
                {recipe && (
                  <div className={cn("rounded overflow-hidden text-sm", isDark ? "bg-slate-800" : "bg-white")}>
                    {/* 显示直接配方材料 */}
                    <div className={cn("px-3 py-2 border-b", isDark ? "border-slate-700 bg-slate-700/50" : "border-gray-200 bg-gray-100")}>
                      <div className="grid grid-cols-3 gap-2 text-xs font-medium text-center">
                        <div className={isDark ? "text-slate-400" : "text-gray-600"}>材料</div>
                        <div className={isDark ? "text-slate-400" : "text-gray-600"}>单个需求</div>
                        <div className={isDark ? "text-slate-400" : "text-gray-600"}>总需求</div>
                      </div>
                    </div>
                    {recipe.ingredients.map((ing, i) => {
                      const totalReq = ing.quantity * target.quantity;
                      return (
                        <div key={i} className={cn("px-3 py-2 border-b last:border-0", isDark ? "border-slate-700" : "border-gray-100")}>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className={isDark ? "text-slate-200" : "text-gray-700"}>{ing.materialName}</div>
                            <div className={isDark ? "text-slate-400" : "text-gray-500"}>
                              {ing.quantity}
                            </div>
                            <div className={cn("font-medium",
                              totalReq > 64 ? (isDark ? "text-purple-400" : "text-purple-600") : (isDark ? "text-blue-400" : "text-blue-600")
                            )}>
                              {totalReq}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 操作按钮 */}
        <div className="mt-5 flex gap-3">
          <button
            onClick={handleCalculate}
            disabled={!targets.some(t => t.recipeId && t.quantity > 0)}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
              targets.some(t => t.recipeId && t.quantity > 0)
                ? isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"
                : isDark ? "bg-slate-600 text-slate-400" : "bg-gray-300 text-gray-500 cursor-not-allowed"
            )}
          >
            <Calculator size={16} />
            计算总需求
          </button>
          <button
            onClick={handleReset}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isDark ? "border border-slate-600 text-slate-300 hover:bg-slate-700" : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            <RefreshCw size={16} />
            重置
          </button>
        </div>
      </div>

      {/* 计算结果 */}
      {showResults && results.length > 0 && (
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-800")}>原材料总需求</h2>
              <p className={cn("text-xs mt-1", isDark ? "text-slate-400" : "text-gray-500")}>
                {targets.filter(t => t.recipeId).length} 种配方 → {results.length} 种原材料
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* 展开子配方开关 */}
              <div className="flex items-center gap-2">
                <span className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-500")}>展开子配方</span>
                <button
                  onClick={() => {
                    toggleExpand(!expandSubRecipes);
                    // 重新计算
                    const validTargets = targets.filter(t => t.recipeId && t.quantity > 0);
                    if (validTargets.length > 0) {
                      const configs: TargetConfig[] = validTargets.map(t => ({
                        recipeId: t.recipeId,
                        quantity: t.quantity,
                      }));
                      const result = performCalculation(configs, !expandSubRecipes);
                      if (result) {
                        setResults(result.results);
                        setExpandedResults(result.expandedResults || []);
                        setTraceNotes(result.traceNotes || new Map());
                      }
                    }
                  }}
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors",
                    expandSubRecipes ? "bg-blue-500" : isDark ? "bg-slate-600" : "bg-gray-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                    expandSubRecipes ? "left-5 translate-x-0" : "left-0.5"
                  )} />
                </button>
              </div>
              <button
                onClick={handleExport}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                  isDark ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-green-600 text-white hover:bg-green-700"
                )}
              >
                <Download size={16} />
                导出
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={cn("border-b", isDark ? "border-slate-700" : "border-gray-200")}>
                  <th className={cn("text-left py-2 px-3 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>原材料</th>
                  <th className={cn("text-right py-2 px-3 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>数量</th>
                  <th className={cn("text-left py-2 px-3 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>单位</th>
                </tr>
              </thead>
              <tbody>
                {results.map((req, idx) => {
                  return (
                    <tr key={req.materialId} className={cn("border-b", isDark ? "border-slate-700" : "border-gray-100")}>
                      <td className={cn("py-2 px-3 font-medium", isDark ? "text-slate-200" : "text-gray-800")}>{req.materialName}</td>
                      <td className={cn("py-2 px-3 text-right font-semibold", 
                        req.totalQuantity > 64 ? (isDark ? "text-purple-400" : "text-purple-600") : (isDark ? "text-blue-400" : "text-blue-600")
                      )}>
                        {req.totalQuantity}
                        {traceNotes.get(req.materialId) && (
                          <span className={cn("text-xs ml-1", isDark ? "text-slate-400" : "text-gray-500")}>
                            ({traceNotes.get(req.materialId)})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {showResults && results.length === 0 && (
        <div className={cn("rounded-lg p-10 text-center", cardClass)}>
          <Calculator className={cn("mx-auto", isDark ? "text-slate-600" : "text-gray-300")} size={40} />
          <p className={cn("mt-3", isDark ? "text-slate-400" : "text-gray-500")}>没有找到任何原材料需求</p>
        </div>
      )}
    </div>
  );
}

// ============ 溯源配置视图 ============
function TraceView({ materials, processSteps, isDark }: { 
  materials: Material[];
  processSteps: ProcessStep[];
  isDark: boolean;
}) {
  const [traceableMaterials, setTraceableMaterials] = useState<TraceableMaterial[]>(getTraceableMaterials());
  const [traceForm, setTraceForm] = useState({ materialId: '', materialName: '', targetMaterialId: '', targetMaterialName: '', targetQuantity: 1 });

  // 获取所有可用材料（基础材料 + 加工产物）
  const getAllAvailableMaterials = () => {
    const all: { id: string; name: string; type: 'raw' | 'processed' }[] = [];
    
    // 基础材料
    materials.forEach(m => {
      all.push({ id: m.id, name: m.name, type: 'raw' });
    });
    
    // 加工产物
    processSteps.forEach(step => {
      step.outputs.forEach(output => {
        const processedId = `processed:${output.name.trim()}`;
        if (output.name.trim() && !all.some(m => m.id === processedId)) {
          all.push({ id: processedId, name: output.name.trim(), type: 'processed' });
        }
      });
    });
    
    return all;
  };

  const allMaterials = getAllAvailableMaterials();
  const rawMaterials = allMaterials.filter(m => m.type === 'raw');
  const processedMaterials = allMaterials.filter(m => m.type === 'processed');

  const cardClass = cn("rounded-xl p-6 backdrop-blur-xl", isDark ? "bg-slate-800/50 border border-slate-700/50" : "bg-white/50 border border-gray-200/50 shadow-sm");

  // 保存溯源配置
  const handleSaveTraceable = () => {
    if (!traceForm.materialId || !traceForm.targetMaterialId || traceForm.targetQuantity <= 0) return;
    const newTraceable: TraceableMaterial = {
      id: generateId(),
      materialId: traceForm.materialId,
      materialName: traceForm.materialName,
      targetMaterialId: traceForm.targetMaterialId,
      targetMaterialName: traceForm.targetMaterialName,
      targetQuantity: traceForm.targetQuantity,
    };
    addTraceableMaterial(newTraceable);
    setTraceableMaterials(getTraceableMaterials());
    setTraceForm({ materialId: '', materialName: '', targetMaterialId: '', targetMaterialName: '', targetQuantity: 1 });
  };

  // 删除溯源配置
  const handleDeleteTraceable = (id: string) => {
    removeTraceableMaterial(id);
    setTraceableMaterials(getTraceableMaterials());
  };

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <h2 className={cn("text-xl font-bold mb-2", isDark ? "text-white" : "text-gray-800")}>溯源配置</h2>
        <p className={cn("text-sm mb-6", isDark ? "text-slate-400" : "text-gray-500")}>
          配置溯源材料后，配方计算结果将展开显示原材料的来源。<br/>
          例如：配置铁块 → 铁锭 9个后，计算结果会显示为 <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>1 (包含 1)</span>，总需求显示为 <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>9 (包含 1)</span>
        </p>

        {/* 添加溯源表单 */}
        <div className={cn("p-5 rounded-xl mb-6", isDark ? "bg-slate-700/50" : "bg-gray-50")}>
          <h3 className={cn("text-sm font-medium mb-4", isDark ? "text-slate-300" : "text-gray-700")}>添加溯源规则</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={cn("block text-xs mb-2", isDark ? "text-slate-400" : "text-gray-500")}>溯源材料</label>
              <select
                value={traceForm.materialId}
                onChange={e => {
                  const mat = allMaterials.find(m => m.id === e.target.value);
                  setTraceForm({ ...traceForm, materialId: e.target.value, materialName: mat?.name || '' });
                }}
                className={cn("w-full px-3 py-2.5 rounded-lg text-sm border", isDark ? "bg-slate-600 text-white border-slate-500" : "bg-white border-gray-300")}
              >
                <option value="">选择材料...</option>
                {rawMaterials.length > 0 && (
                  <optgroup label="基础材料">
                    {rawMaterials.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
                {processedMaterials.length > 0 && (
                  <optgroup label="加工产物">
                    {processedMaterials.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className={cn("block text-xs mb-2", isDark ? "text-slate-400" : "text-gray-500")}>溯源目标</label>
              <select
                value={traceForm.targetMaterialId}
                onChange={e => {
                  const mat = allMaterials.find(m => m.id === e.target.value);
                  setTraceForm({ ...traceForm, targetMaterialId: e.target.value, targetMaterialName: mat?.name || '' });
                }}
                className={cn("w-full px-3 py-2.5 rounded-lg text-sm border", isDark ? "bg-slate-600 text-white border-slate-500" : "bg-white border-gray-300")}
              >
                <option value="">选择目标...</option>
                {rawMaterials.length > 0 && (
                  <optgroup label="基础材料">
                    {rawMaterials.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
                {processedMaterials.length > 0 && (
                  <optgroup label="加工产物">
                    {processedMaterials.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className={cn("block text-xs mb-2", isDark ? "text-slate-400" : "text-gray-500")}>每1个材料需要目标数量</label>
              <input
                type="number"
                min="1"
                value={traceForm.targetQuantity}
                onChange={e => setTraceForm({ ...traceForm, targetQuantity: parseInt(e.target.value) || 1 })}
                className={cn("w-full px-3 py-2.5 rounded-lg text-sm", isDark ? "bg-slate-600 text-white border-slate-500" : "bg-white border-gray-300")}
              />
            </div>
          </div>
          <button
            onClick={handleSaveTraceable}
            disabled={!traceForm.materialId || !traceForm.targetMaterialId || traceForm.targetQuantity <= 0}
            className={cn(
              "w-full md:w-auto px-6 py-2.5 rounded-lg text-sm font-medium",
              traceForm.materialId && traceForm.targetMaterialId && traceForm.targetQuantity > 0
                ? (isDark ? "bg-cyan-600 text-white hover:bg-cyan-700" : "bg-cyan-500 text-white hover:bg-cyan-600")
                : (isDark ? "bg-slate-600 text-slate-400" : "bg-gray-300 text-gray-500 cursor-not-allowed")
            )}
          >
            添加规则
          </button>
        </div>

        {/* 已有溯源配置列表 */}
        <div>
          <h3 className={cn("text-sm font-medium mb-4", isDark ? "text-slate-300" : "text-gray-700")}>
            已配置的溯源规则 ({traceableMaterials.length})
          </h3>
          {traceableMaterials.length === 0 ? (
            <div className={cn("text-center py-12 rounded-xl", isDark ? "bg-slate-700/30" : "bg-gray-50")}>
              <Search className={cn("mx-auto mb-3 opacity-50", isDark ? "text-slate-500" : "text-gray-400")} size={40} />
              <p className={cn("text-sm", isDark ? "text-slate-500" : "text-gray-400")}>暂无配置，点击上方表单添加溯源规则</p>
            </div>
          ) : (
            <div className="space-y-3">
              {traceableMaterials.map(trace => (
                <div 
                  key={trace.id} 
                  className={cn("flex items-center justify-between p-4 rounded-xl", isDark ? "bg-slate-700/50" : "bg-gray-50")}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600")}>
                      {trace.materialName}
                    </span>
                    <span className={cn("text-lg", isDark ? "text-slate-500" : "text-gray-400")}>→</span>
                    <span className={cn("px-3 py-1.5 rounded-lg text-sm font-medium", isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-100 text-cyan-600")}>
                      {trace.targetMaterialName} × {trace.targetQuantity}
                    </span>
                    <span className={cn("text-xs px-2 py-1 rounded", isDark ? "bg-slate-600 text-slate-400" : "bg-gray-200 text-gray-500")}>
                      每1个{trace.materialName} = {trace.targetQuantity}个{trace.targetMaterialName}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTraceable(trace.id)}
                    className={cn("p-2 rounded-lg", isDark ? "text-red-400 hover:bg-slate-600" : "text-red-500 hover:bg-red-100")}
                    title="删除规则"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ 原材料管理视图 ============
function MaterialsView({ materials, onMaterialsChange, isDark }: { 
  materials: Material[];
  onMaterialsChange: () => void;
  isDark: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: '个' });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // 检查原材料名称重复
    const trimmedName = formData.name.trim();
    const isDuplicate = materials.some(m => 
      m.name.trim().toLowerCase() === trimmedName.toLowerCase() && m.id !== editingId
    );
    if (isDuplicate) {
      alert(`原材料"${trimmedName}"已存在，请使用其他名称！`);
      return;
    }

    if (editingId) {
      updateMaterial(editingId, { name: trimmedName, unit: formData.unit });
      setEditingId(null);
    } else {
      const newMaterial: Material = {
        id: generateId(),
        name: trimmedName,
        unit: formData.unit,
        createdAt: Date.now(),
      };
      addMaterial(newMaterial);
    }

    setFormData({ name: '', unit: '个' });
    setShowForm(false);
    onMaterialsChange();
  };

  const handleEdit = (material: Material) => {
    setFormData({ name: material.name, unit: material.unit });
    setEditingId(material.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个原材料吗？')) {
      deleteMaterial(id);
      onMaterialsChange();
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', unit: '个' });
    setEditingId(null);
    setShowForm(false);
  };

  const cardClass = cn("rounded-xl backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className="space-y-5">
      {/* 头部操作 */}
      <div className={cn("rounded-xl p-4 backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={cn("px-4 py-2.5 rounded-lg text-base", 
                isDark ? "bg-slate-700/80 text-white border-slate-600 placeholder-slate-400" : "border border-gray-300"
              )}
            />
            <span className={cn("text-base", isDark ? "text-slate-400" : "text-gray-500")}>
              {filteredMaterials.length} 个
            </span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-base",
              isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            <Plus size={18} />
            添加
          </button>
        </div>
      </div>

      {/* 添加/编辑表单 */}
      {showForm && (
        <div className={cn("rounded-xl p-6 backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg")}>
          <h3 className={cn("font-semibold mb-4", isDark ? "text-white" : "text-gray-800")}>
            {editingId ? '编辑原材料' : '添加新原材料'}
          </h3>
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1">
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={cn("w-full px-3 py-2 rounded-lg text-sm", 
                  isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                )}
                placeholder="名称"
              />
            </div>
            <div className="w-24">
              <input
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className={cn("w-full px-3 py-2 rounded-lg text-sm", 
                  isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                )}
                placeholder="单位"
              />
            </div>
            <button type="submit" className={cn(
              "px-4 py-2 rounded-lg text-sm",
              isDark ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
            )}>
              <Save size={16} />
            </button>
            <button type="button" onClick={handleCancel} className={cn(
              "px-3 py-2 rounded-lg text-sm",
              isDark ? "border border-slate-600 text-slate-300" : "border border-gray-300"
            )}>
              <X size={16} />
            </button>
          </form>
        </div>
      )}

      {/* 原材料列表 */}
      <div className={cn("rounded-xl overflow-hidden backdrop-blur-xl", cardClass)}>
        {filteredMaterials.length === 0 ? (
          <div className="p-10 text-center">
            <Package className={cn("mx-auto", isDark ? "text-slate-600" : "text-gray-300")} size={40} />
            <p className={cn("mt-3", isDark ? "text-slate-400" : "text-gray-500")}>
              {searchTerm ? '没有找到' : '暂无数据'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className={isDark ? "bg-slate-700/50" : "bg-gray-50"}>
              <tr>
                <th className={cn("text-left py-2.5 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>名称</th>
                <th className={cn("text-left py-2.5 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>单位</th>
                <th className={cn("text-right py-2.5 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map(material => (
                <tr key={material.id} className={cn("border-t", isDark ? "border-slate-700" : "border-gray-100")}>
                  <td className={cn("py-2.5 px-4 font-medium", isDark ? "text-slate-200" : "text-gray-800")}>{material.name}</td>
                  <td className={cn("py-2.5 px-4", isDark ? "text-slate-400" : "text-gray-500")}>{material.unit}</td>
                  <td className="py-2.5 px-4 text-right">
                    <button onClick={() => handleEdit(material)} className={cn("p-1.5 rounded", isDark ? "text-blue-400 hover:bg-slate-700" : "text-blue-600 hover:bg-blue-50")}>
                      <Edit2 size={15} />
                    </button>
                    <button onClick={() => handleDelete(material.id)} className={cn("p-1.5 rounded", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-red-50")}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ============ 加工步骤管理视图 ============
function ProcessStepsView({ materials, processSteps, onProcessStepsChange, isDark }: {
  materials: Material[];
  processSteps: ProcessStep[];
  onProcessStepsChange: () => void;
  isDark: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    inputs: { name: string; quantity: number }[];
    processName: string;
    outputs: { name: string; quantity: number }[];
  }>({
    inputs: [{ name: '', quantity: 1 }],
    processName: '',
    outputs: [{ name: '', quantity: 1 }],
  });
  const [searchTerm, setSearchTerm] = useState('');

  // 获取所有可用的原材料（基础材料 + 加工产物）
  const getAllAvailableInputs = useCallback(() => {
    const available: { id: string; name: string; type: 'raw' | 'processed' }[] = [];
    
    // 添加基础材料
    materials.forEach(m => {
      available.push({ id: m.id, name: m.name, type: 'raw' });
    });
    
    // 添加加工产物（排除当前编辑的步骤，避免循环引用）
    const processedNames = new Set<string>();
    processSteps.forEach(step => {
      if (editingId && step.id === editingId) return; // 编辑时排除自身
      step.outputs.forEach(output => {
        if (output.name.trim() && !processedNames.has(output.name.trim())) {
          processedNames.add(output.name.trim());
          available.push({ id: `processed:${output.name.trim()}`, name: output.name.trim(), type: 'processed' });
        }
      });
    });
    
    return available;
  }, [materials, processSteps, editingId]);

  const filteredSteps = processSteps.filter(s => 
    s.inputs.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.outputs.some(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.processName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 添加原材料输入框
  const addInput = () => {
    if (formData.inputs.length < 9) {
      setFormData({ ...formData, inputs: [...formData.inputs, { name: '', quantity: 1 }] });
    }
  };

  // 移除原材料输入框
  const removeInput = (index: number) => {
    if (formData.inputs.length > 1) {
      setFormData({ ...formData, inputs: formData.inputs.filter((_, i) => i !== index) });
    }
  };

  // 更新原材料
  const updateInput = (index: number, field: 'name' | 'quantity', value: string | number) => {
    const newInputs = [...formData.inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setFormData({ ...formData, inputs: newInputs });
  };

  // 添加产物输入框
  const addOutput = () => {
    if (formData.outputs.length < 9) {
      setFormData({ ...formData, outputs: [...formData.outputs, { name: '', quantity: 1 }] });
    }
  };

  // 移除产物输入框
  const removeOutput = (index: number) => {
    if (formData.outputs.length > 1) {
      setFormData({ ...formData, outputs: formData.outputs.filter((_, i) => i !== index) });
    }
  };

  // 更新产物
  const updateOutput = (index: number, field: 'name' | 'quantity', value: string | number) => {
    const newOutputs = [...formData.outputs];
    newOutputs[index] = { ...newOutputs[index], [field]: value };
    setFormData({ ...formData, outputs: newOutputs });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validInputs = formData.inputs.filter(i => i.name.trim());
    const validOutputs = formData.outputs.filter(o => o.name.trim());
    if (validInputs.length === 0 || !formData.processName.trim() || validOutputs.length === 0) return;

    // 检查加工步骤名称重复
    const trimmedProcessName = formData.processName.trim();
    const isProcessNameDuplicate = processSteps.some(s => 
      s.processName.trim().toLowerCase() === trimmedProcessName.toLowerCase() && s.id !== editingId
    );
    if (isProcessNameDuplicate) {
      alert(`加工步骤"${trimmedProcessName}"已存在，请使用其他名称！`);
      return;
    }

    // 检查产物名称是否与已有原材料或产物重复
    const outputNames = validOutputs.map(o => o.name.trim().toLowerCase());
    const duplicateOutputs: string[] = [];
    
    // 检查是否与原材料重复
    materials.forEach(m => {
      if (outputNames.includes(m.name.trim().toLowerCase())) {
        duplicateOutputs.push(m.name);
      }
    });
    
    // 检查是否与其他步骤的产物重复
    processSteps.forEach(s => {
      if (editingId && s.id === editingId) return;
      s.outputs.forEach(o => {
        if (outputNames.includes(o.name.trim().toLowerCase())) {
          duplicateOutputs.push(o.name);
        }
      });
    });
    
    if (duplicateOutputs.length > 0) {
      alert(`产物"${[...new Set(duplicateOutputs)].join('、')}"已存在（作为原材料或其他加工产物），请使用其他名称！`);
      return;
    }

    // 处理材料名称（去除 processed: 前缀）
    const processInputs = (name: string) => {
      return name.startsWith('processed:') ? name.replace('processed:', '') : name;
    };

    if (editingId) {
      updateProcessStep(editingId, {
        inputs: validInputs.map(i => ({ name: processInputs(i.name.trim()), quantity: i.quantity })),
        processName: trimmedProcessName,
        outputs: validOutputs.map(o => ({ name: o.name.trim(), quantity: o.quantity })),
      });
      setEditingId(null);
    } else {
      const newStep: ProcessStep = {
        id: generateId(),
        inputs: validInputs.map(i => ({ name: processInputs(i.name.trim()), quantity: i.quantity })),
        processName: trimmedProcessName,
        outputs: validOutputs.map(o => ({ name: o.name.trim(), quantity: o.quantity })),
        createdAt: Date.now(),
      };
      addProcessStep(newStep);
    }

    resetForm();
    onProcessStepsChange();
  };

  const resetForm = () => {
    setFormData({
      inputs: [{ name: '', quantity: 1 }],
      processName: '',
      outputs: [{ name: '', quantity: 1 }],
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (step: ProcessStep) => {
    // 将已有的材料名称转换为带前缀的选择值
    const convertToSelectValue = (name: string): string => {
      // 检查是否存在于基础材料中
      const existsAsRaw = materials.some(m => m.name === name);
      if (!existsAsRaw) {
        // 检查是否存在于其他步骤的产物中
        const existsAsProcessed = processSteps.some(s => 
          s.id !== step.id && s.outputs.some(o => o.name === name)
        );
        if (existsAsProcessed) {
          return `processed:${name}`;
        }
      }
      return name;
    };

    setFormData({
      inputs: step.inputs.length > 0 
        ? step.inputs.map(i => ({ name: convertToSelectValue(i.name), quantity: i.quantity }))
        : [{ name: '', quantity: 1 }],
      processName: step.processName,
      outputs: step.outputs.length > 0 ? step.outputs : [{ name: '', quantity: 1 }],
    });
    setEditingId(step.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个加工步骤吗？')) {
      deleteProcessStep(id);
      onProcessStepsChange();
    }
  };

  const cardClass = cn("rounded-xl backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className={cn("space-y-5", isDark ? "text-slate-200" : "text-gray-700")}>
      {/* 头部操作 */}
      <div className={cn("rounded-xl p-4 backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg")}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">加工步骤管理</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className={cn("flex items-center gap-1.5 px-4 py-2 rounded text-base font-medium", isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white")}
          >
            <Plus size={18} />
            {showForm ? '取消' : '添加步骤'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={cn("p-6 rounded-xl mb-4 backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg")}>
          {/* 原材料输入 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className={cn("text-base font-medium", isDark ? "text-slate-300" : "text-gray-700")}>原材料 (1-9种)</label>
              {formData.inputs.length < 9 && (
                <button type="button" onClick={addInput} className={cn("text-sm px-3 py-1.5 rounded", isDark ? "bg-slate-700/80 hover:bg-slate-600 text-slate-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600")}>
                  + 添加原材料
                </button>
              )}
            </div>
            <div className="space-y-2">
              {formData.inputs.map((input, index) => {
                const allInputs = getAllAvailableInputs();
                const rawInputs = allInputs.filter(t => t.type === 'raw');
                const processedInputs = allInputs.filter(t => t.type === 'processed');
                
                return (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={input.name}
                      onChange={e => updateInput(index, 'name', e.target.value)}
                      className={cn("flex-1 px-3 py-2 rounded border text-sm", isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300")}
                    >
                      <option value="">选择原材料...</option>
                      {rawInputs.length > 0 && (
                        <optgroup label="基础材料">
                          {rawInputs.map(m => (
                            <option key={m.id} value={m.name}>{m.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {processedInputs.length > 0 && (
                        <optgroup label="加工产物">
                          {processedInputs.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={input.quantity}
                      onChange={e => updateInput(index, 'quantity', Number(e.target.value))}
                      className={cn("w-20 px-2 py-2 rounded border text-sm text-center", isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300")}
                    />
                    {formData.inputs.length > 1 && (
                      <button type="button" onClick={() => removeInput(index)} className={cn("p-1.5 rounded", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-500 hover:bg-red-100")}>
                        <X size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 加工步骤 */}
          <div className="mb-4">
            <label className={cn("block text-base font-medium mb-2", isDark ? "text-slate-300" : "text-gray-700")}>加工步骤</label>
            <input
              type="text"
              value={formData.processName}
              onChange={e => setFormData({ ...formData, processName: e.target.value })}
              className={cn("w-full px-4 py-2.5 rounded-lg border text-base", isDark ? "bg-slate-700/80 border-slate-600 text-white" : "bg-white border-gray-300")}
              placeholder="如：压制、熔炼、切割"
              required
            />
          </div>

          {/* 产物输出 */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className={cn("text-base font-medium", isDark ? "text-slate-300" : "text-gray-700")}>产物 (1-9种)</label>
              {formData.outputs.length < 9 && (
                <button type="button" onClick={addOutput} className={cn("text-sm px-3 py-1.5 rounded", isDark ? "bg-slate-700/80 hover:bg-slate-600 text-slate-300" : "bg-gray-200 hover:bg-gray-300 text-gray-600")}>
                  + 添加产物
                </button>
              )}
            </div>
            <div className="space-y-2">
              {formData.outputs.map((output, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={output.name}
                    onChange={e => updateOutput(index, 'name', e.target.value)}
                    className={cn("flex-1 px-4 py-2.5 rounded-lg border text-base", isDark ? "bg-slate-700/80 border-slate-600 text-white" : "bg-white border-gray-300")}
                    placeholder={`产物${index + 1}名称`}
                  />
                  <input
                    type="number"
                    min="1"
                    value={output.quantity}
                    onChange={e => updateOutput(index, 'quantity', Number(e.target.value))}
                    className={cn("w-24 px-3 py-2.5 rounded-lg border text-base text-center", isDark ? "bg-slate-700/80 border-slate-600 text-white" : "bg-white border-gray-300")}
                  />
                  {formData.outputs.length > 1 && (
                    <button type="button" onClick={() => removeOutput(index)} className={cn("p-2 rounded-lg", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-500 hover:bg-red-100")}>
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button type="submit" className={cn("flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-base font-medium", isDark ? "bg-green-600 hover:bg-green-700 text-white" : "bg-green-500 hover:bg-green-600 text-white")}>
              <Save size={18} />
              {editingId ? '保存修改' : '确认添加'}
            </button>
            <button type="button" onClick={resetForm} className={cn("flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-base font-medium", isDark ? "bg-slate-600 hover:bg-slate-500 text-white" : "bg-gray-300 hover:bg-gray-400 text-gray-700")}>
              <X size={18} />
              取消
            </button>
          </div>
        </form>
      )}

      <input
        type="text"
        placeholder="搜索..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className={cn("w-full px-4 py-2.5 rounded-xl border mb-4 text-base", isDark ? "bg-slate-800/60 backdrop-blur-sm border-slate-600 text-white placeholder-slate-400" : "bg-white/70 border-gray-300")}
      />

      {filteredSteps.length === 0 ? (
        <div className={cn("text-center py-16 rounded-xl", cardClass)}>
          <Cog size={56} className={cn("mx-auto mb-3 opacity-30", isDark ? "text-slate-500" : "text-gray-400")} />
          <p className={cn("text-lg", isDark ? "text-slate-400" : "text-gray-500")}>
            {searchTerm ? '没有找到匹配的加工步骤' : '暂无加工步骤，点击上方按钮添加'}
          </p>
        </div>
      ) : (
        <div className={cn("rounded-xl overflow-hidden backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50")}>
          {filteredSteps.map((step, idx) => (
            <div key={step.id} className={cn("p-5 border-t first:border-t-0", isDark ? "border-slate-700/50" : "border-gray-200/50")}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* 原材料 */}
                    <div className={cn("px-3 py-2 rounded-lg text-base", isDark ? "bg-slate-700/70" : "bg-gray-100")}>
                      <span className={cn("font-medium", isDark ? "text-blue-400" : "text-blue-600")}>原料：</span>
                      {step.inputs.map((input, i) => (
                        <span key={i}>
                          {input.quantity}×{input.name}{i < step.inputs.length - 1 ? ' + ' : ''}
                        </span>
                      ))}
                    </div>
                    {/* 箭头 */}
                    <span className={cn("text-xl font-bold", isDark ? "text-yellow-400" : "text-yellow-600")}>→</span>
                    {/* 产物 */}
                    <div className={cn("px-3 py-2 rounded-lg text-base", isDark ? "bg-slate-700/70" : "bg-gray-100")}>
                      <span className={cn("font-medium", isDark ? "text-green-400" : "text-green-600")}>产物：</span>
                      {step.outputs.map((output, i) => (
                        <span key={i}>
                          {output.quantity}×{output.name}{i < step.outputs.length - 1 ? ' + ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={cn("mt-2 text-base", isDark ? "text-slate-400" : "text-gray-500")}>
                    工序：{step.processName}
                  </div>
                </div>
                <div className="flex gap-2 ml-3">
                  <button onClick={() => handleEdit(step)} className={cn("p-2 rounded-lg", isDark ? "text-blue-400 hover:bg-slate-700" : "text-blue-600 hover:bg-blue-50")}>
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(step.id)} className={cn("p-2 rounded-lg", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-red-50")}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 配方管理视图 ============
function RecipesView({ materials, recipes, processSteps, onRecipesChange, isDark }: {
  materials: Material[];
  recipes: Recipe[];
  processSteps?: ProcessStep[];
  onRecipesChange: () => void;
  isDark: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    outputQuantity: 1,
    ingredients: [{ materialId: '', quantity: 1 }] as { materialId: string; quantity: number }[],
  });
  const [searchTerm, setSearchTerm] = useState('');

  // 获取所有可用的目标材料（原材料 + 加工步骤产物 + 其他配方）
  const getAllTargetMaterials = useCallback(() => {
    const targets: RecipeProduct[] = [];
    
    // 添加原材料
    materials.forEach(m => {
      targets.push({ id: m.id, name: m.name, type: 'raw' });
    });
    
    // 添加加工步骤的产物（去重）
    if (processSteps) {
      const processedNames = new Set<string>();
      processSteps.forEach(step => {
        step.outputs.forEach(output => {
          if (output.name.trim() && !processedNames.has(output.name.trim())) {
            processedNames.add(output.name.trim());
            // 产物名称作为 ID（添加前缀避免与原材料 ID 冲突）
            targets.push({ id: `processed:${output.name.trim()}`, name: output.name.trim(), type: 'processed' });
          }
        });
      });
    }
    
    // 添加其他配方作为可选材料（排除自己，防止循环引用）
    const currentRecipes = recipes.filter(r => r.id !== editingId);
    const addedRecipeNames = new Set<string>();
    currentRecipes.forEach(recipe => {
      if (!addedRecipeNames.has(recipe.name)) {
        addedRecipeNames.add(recipe.name);
        // 使用 recipe: 前缀 + 配方ID 来标识这是配方类型
        targets.push({ 
          id: `recipe:${recipe.id}`, 
          name: recipe.name + ' [配方]', 
          type: 'recipe',
          recipeId: recipe.id 
        });
      }
    });
    
    return targets;
  }, [materials, processSteps, recipes, editingId]);

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.ingredients.length === 0) return;

    // 检查配方名称重复
    const trimmedName = formData.name.trim();
    const isNameDuplicate = recipes.some(r => 
      r.name.trim().toLowerCase() === trimmedName.toLowerCase() && r.id !== editingId
    );
    if (isNameDuplicate) {
      alert(`配方"${trimmedName}"已存在，请使用其他名称！`);
      return;
    }

    const validIngredients = formData.ingredients
      .filter(ing => ing.materialId && ing.quantity > 0)
      .map(ing => {
        // 检查是否是配方类型（recipe:前缀）
        if (ing.materialId.startsWith('recipe:')) {
          const recipeId = ing.materialId.replace('recipe:', '');
          const recipe = recipes.find(r => r.id === recipeId);
          return {
            ...ing,
            materialId: ing.materialId,
            materialName: recipe?.name || ing.materialId,
          };
        }
        // 检查是否是加工产物
        if (ing.materialId.startsWith('processed:')) {
          const processedName = ing.materialId.replace('processed:', '');
          return {
            ...ing,
            materialId: ing.materialId,
            materialName: processedName,
          };
        }
        // 基础原材料
        return {
          ...ing,
          materialName: materials.find(m => m.id === ing.materialId)?.name || '',
        };
      });

    if (validIngredients.length === 0) return;

    if (editingId) {
      updateRecipe(editingId, {
        name: trimmedName,
        outputQuantity: formData.outputQuantity,
        ingredients: validIngredients,
      });
      setEditingId(null);
    } else {
      const newRecipe: Recipe = {
        id: generateId(),
        name: trimmedName,
        outputQuantity: formData.outputQuantity,
        ingredients: validIngredients,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addRecipe(newRecipe);
    }

    resetForm();
    onRecipesChange();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      outputQuantity: 1,
      ingredients: [{ materialId: '', quantity: 1 }],
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (recipe: Recipe) => {
    setFormData({
      name: recipe.name,
      outputQuantity: recipe.outputQuantity,
      ingredients: recipe.ingredients.map(ing => ({
        materialId: ing.materialId,
        quantity: ing.quantity,
      })),
    });
    setEditingId(recipe.id);
    setShowForm(true);
  };

  // 获取目标材料名称（用于显示）
  const getIngredientDisplayName = (ingredient: { materialId: string; materialName: string }): string => {
    if (ingredient.materialId.startsWith('recipe:')) {
      return ingredient.materialName + ' [配方]';
    }
    if (ingredient.materialId.startsWith('processed:')) {
      return ingredient.materialName + ' [加工产物]';
    }
    return ingredient.materialName;
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个配方吗？')) {
      deleteRecipe(id);
      onRecipesChange();
    }
  };

  const addIngredient = () => {
    if (formData.ingredients.length < 9) {
      setFormData({
        ...formData,
        ingredients: [...formData.ingredients, { materialId: '', quantity: 1 }],
      });
    }
  };

  const removeIngredient = (index: number) => {
    if (formData.ingredients.length > 1) {
      setFormData({
        ...formData,
        ingredients: formData.ingredients.filter((_, i) => i !== index),
      });
    }
  };

  const updateIngredient = (index: number, field: 'materialId' | 'quantity', value: string | number) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const cardClass = cn("rounded-xl backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className="space-y-5">
      {/* 头部操作 */}
      <div className={cn("rounded-xl p-4 backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={cn("px-4 py-2.5 rounded-lg text-base", 
                isDark ? "bg-slate-700/80 text-white border-slate-600 placeholder-slate-400" : "border border-gray-300"
              )}
            />
            <span className={cn("text-base", isDark ? "text-slate-400" : "text-gray-500")}>
              {filteredRecipes.length} 个
            </span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-base",
              isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            <Plus size={18} />
            添加
          </button>
        </div>
      </div>

      {/* 添加/编辑表单 */}
      {showForm && (
        <div className={cn("rounded-xl p-6 backdrop-blur-xl", cardClass)}>
          <h3 className={cn("font-semibold mb-4", isDark ? "text-white" : "text-gray-800")}>
            {editingId ? '编辑配方' : '添加新配方'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm", 
                    isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                  )}
                  placeholder="配方名称（目标材料）"
                />
              </div>
              <div>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.outputQuantity}
                  onChange={e => setFormData({ ...formData, outputQuantity: parseInt(e.target.value) || 1 })}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm", 
                    isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                  )}
                  placeholder="产出数量"
                />
              </div>
            </div>

            {/* 原材料列表 */}
            <div className="space-y-2">
              {formData.ingredients.map((ing, index) => {
                const allTargets = getAllTargetMaterials();
                const rawMaterials = allTargets.filter(t => t.type === 'raw');
                const processedMaterials = allTargets.filter(t => t.type === 'processed');
                const recipeMaterials = allTargets.filter(t => t.type === 'recipe');
                
                return (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={ing.materialId}
                      onChange={e => updateIngredient(index, 'materialId', e.target.value)}
                      className={cn("flex-1 px-3 py-2 rounded-lg text-sm", 
                        isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                      )}
                    >
                      <option value="">选择原材料...</option>
                      {rawMaterials.length > 0 && (
                        <optgroup label="基础材料">
                          {rawMaterials.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {processedMaterials.length > 0 && (
                        <optgroup label="加工产物">
                          {processedMaterials.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </optgroup>
                      )}
                      {recipeMaterials.length > 0 && (
                        <optgroup label="配方（子配方）">
                          {recipeMaterials.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <span className={isDark ? "text-slate-400" : "text-gray-400"}>×</span>
                    <input
                      type="number"
                      min="1"
                      value={ing.quantity}
                      onChange={e => updateIngredient(index, 'quantity', parseInt(e.target.value) || 1)}
                      className={cn("w-16 px-2 py-2 rounded-lg text-sm text-center", 
                        isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                      )}
                    />
                    {formData.ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className={cn("p-1.5 rounded", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-red-50")}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
              {formData.ingredients.length < 9 && (
                <button
                  type="button"
                  onClick={addIngredient}
                  className={cn("text-sm", isDark ? "text-blue-400" : "text-blue-600")}
                >
                  + 添加原材料
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm",
                  isDark ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                )}
              >
                <Save size={15} className="inline mr-1" />
                保存
              </button>
              <button
                type="button"
                onClick={resetForm}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm",
                  isDark ? "border border-slate-600 text-slate-300" : "border border-gray-300"
                )}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 配方列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecipes.length === 0 ? (
          <div className={cn("col-span-2 rounded-xl p-12 text-center backdrop-blur-xl", cardClass)}>
            <BookOpen className={cn("mx-auto", isDark ? "text-slate-600" : "text-gray-300")} size={48} />
            <p className={cn("mt-4 text-lg", isDark ? "text-slate-400" : "text-gray-500")}>
              {searchTerm ? '没有找到' : '暂无配方'}
            </p>
          </div>
        ) : (
          filteredRecipes.map(recipe => (
            <div key={recipe.id} className={cn("rounded-xl p-5", cardClass)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-800")}>{recipe.name}</h3>
                  <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-gray-500")}>
                    {recipe.ingredients.length} 种原材料
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(recipe)} className={cn("p-2 rounded-lg", isDark ? "text-blue-400 hover:bg-slate-700" : "text-blue-600 hover:bg-blue-50")}>
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(recipe.id)} className={cn("p-2 rounded-lg", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-red-50")}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className={cn("mt-4 pt-4 border-t", isDark ? "border-slate-700/50" : "border-gray-100")}>
                <div className="flex flex-wrap gap-2">
                  {recipe.ingredients.map((ing, idx) => (
                    <span key={idx} className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm", isDark ? "bg-slate-700/70 text-slate-300" : "bg-gray-100 text-gray-600")}>
                      {ing.materialName} ×{ing.quantity}
                      <button
                        onClick={() => {
                          if (confirm(`确定要从"${recipe.name}"中移除"${ing.materialName}"吗？`)) {
                            removeIngredientFromRecipe(recipe.id, ing.materialId);
                            onRecipesChange();
                          }
                        }}
                        className={cn("ml-0.5 hover:text-red-500", isDark ? "text-slate-500" : "text-gray-400")}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============ 历史记录视图 ============
function HistoryView({ history, recipes, onHistoryChange, isDark }: {
  history: CalculationHistory[];
  recipes: Recipe[];
  onHistoryChange: () => void;
  isDark: boolean;
}) {
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  const handleDeleteItem = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      deleteHistoryItem(id);
      onHistoryChange();
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      clearHistory();
      onHistoryChange();
    }
  };

  const handleExport = (record: CalculationHistory) => {
    const csvContent = [
      '原材料名称,总需求量,单位',
      ...record.results.map(r => `${r.materialName},${r.totalQuantity},${r.unit}`)
    ].join('\n');
    downloadCSV(csvContent, `原材料需求_${record.id}.csv`);
  };

  const cardClass = cn("rounded-xl backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className="space-y-5">
      {/* 头部操作 */}
      <div className={cn("rounded-xl p-4 backdrop-blur-xl flex items-center justify-between", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg")}>
        <h2 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-800")}>
          计算历史 
          <span className={cn("text-base font-normal ml-2", isDark ? "text-slate-400" : "text-gray-500")}>
            {history.length} 条
          </span>
        </h2>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-base",
              isDark ? "text-red-400 border border-red-400 hover:bg-slate-700" : "text-red-600 border border-red-600 hover:bg-red-50"
            )}
          >
            <Trash2 size={18} />
            清空
          </button>
        )}
      </div>

      {/* 历史列表 */}
      {history.length === 0 ? (
        <div className={cn("rounded-xl p-12 text-center backdrop-blur-xl", cardClass)}>
          <History className={cn("mx-auto", isDark ? "text-slate-600" : "text-gray-300")} size={48} />
          <p className={cn("mt-4 text-lg", isDark ? "text-slate-400" : "text-gray-500")}>暂无历史记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(record => (
            <div
              key={record.id}
              className={cn(
                'rounded-xl cursor-pointer transition-all',
                cardClass,
                selectedRecord === record.id && (isDark ? "ring-2 ring-blue-400" : "ring-2 ring-blue-500")
              )}
              onClick={() => setSelectedRecord(selectedRecord === record.id ? null : record.id)}
            >
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl", isDark ? "bg-blue-500/20" : "bg-blue-100")}>
                    <Calculator className={isDark ? "text-blue-400" : "text-blue-600"} size={20} />
                  </div>
                  <div>
                    <p className={cn("font-medium text-base", isDark ? "text-white" : "text-gray-800")}>
                      [{record.summary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(record.id); }}
                    className={cn("p-2 rounded-lg", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-red-50")}
                    title="删除"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExport(record); }}
                    className={cn("p-2 rounded-lg", isDark ? "text-green-400 hover:bg-slate-700" : "text-green-600 hover:bg-green-50")}
                    title="导出"
                  >
                    <Download size={18} />
                  </button>
                  <ChevronRight
                    size={20}
                    className={cn(
                      'transition-transform',
                      selectedRecord === record.id ? "rotate-90" : "",
                      isDark ? "text-slate-400" : "text-gray-400"
                    )}
                  />
                </div>
              </div>

              {/* 展开详情 */}
              {selectedRecord === record.id && (
                <div className={cn("px-4 pb-4 pt-0 border-t", isDark ? "border-slate-700" : "border-gray-100")}>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className={cn("border-b", isDark ? "border-slate-700" : "border-gray-100")}>
                        <th className={cn("text-left py-2 px-2 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>原材料</th>
                        <th className={cn("text-right py-2 px-2 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>需求量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.results.map(req => (
                        <tr key={req.materialId} className={cn("border-b", isDark ? "border-slate-700" : "border-gray-50")}>
                          <td className={cn("py-2 px-2", isDark ? "text-slate-200" : "text-gray-800")}>{req.materialName}</td>
                          <td className={cn("py-2 px-2 text-right font-medium", isDark ? "text-blue-400" : "text-blue-600")}>
                            {req.totalQuantity} {req.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
