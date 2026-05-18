import { useState, useEffect } from 'react';
import { Calculator, Package, BookOpen, History, Plus, Trash2, Edit2, Save, X, Download, RefreshCw, ChevronRight, LogOut, LogIn, Loader2, Lock, Settings } from 'lucide-react';
import { cn } from './utils/utils';
import { getMaterials, getRecipes, getHistory, saveMaterials, saveRecipes, addMaterial, addRecipe, deleteMaterial, deleteRecipe, updateMaterial, updateRecipe, clearHistory, deleteHistoryItem, generateId, removeIngredientFromRecipe } from './utils/storage';
import { performCalculation, downloadCSV, calculateDirectRequirements } from './utils/calculator';
import { Material, Recipe, CalculationHistory, MaterialRequirement, ExpandedRequirement } from './types';
import { UserSettingsView } from './UserSettingsView';
import { VERSION, BUILD_TIME } from './utils/version';
import { supabase } from './utils/supabase';
import { getAdminData, getUserDataFromDB } from './utils/adminData';

// Tab类型
type TabType = 'calculator' | 'materials' | 'recipes' | 'history' | 'settings';

// 单个目标材料配置
interface TargetMaterial {
  id: string;
  recipeId: string;
  quantity: number;
}

// Tab配置
const tabs = [
  { id: 'calculator' as TabType, label: '配方计算', icon: Calculator },
  { id: 'materials' as TabType, label: '物品管理', icon: Package },
  { id: 'recipes' as TabType, label: '配方管理', icon: BookOpen },
  { id: 'history' as TabType, label: '历史记录', icon: History },
  { id: 'settings' as TabType, label: '用户设置', icon: Settings },
];

// 深色主题
const isDark = true;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [isReadOnly, setIsReadOnly] = useState(false); // 未登录时只读模式

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const localMaterials = getMaterials();
    const localRecipes = getRecipes();
    const localHistory = getHistory();

    // 检查是否登录
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (currentUserId) {
      // 登录用户：从 Supabase 同步数据（强制覆盖本地缓存）
      const userData = await getUserDataFromDB(currentUserId);
      setMaterials(userData.materials);
      setRecipes(userData.recipes);
      saveMaterials(userData.materials);
      saveRecipes(userData.recipes);
      setHistory(localHistory);
      setIsReadOnly(false); // 登录用户可编辑
      return;
    }

    // 未登录用户：使用本地数据或 admin 数据
    if (localMaterials.length === 0 && localRecipes.length === 0) {
      const adminData = await getAdminData();
      if (adminData.materials.length > 0 || adminData.recipes.length > 0) {
        setMaterials(adminData.materials);
        setRecipes(adminData.recipes);
        saveMaterials(adminData.materials);
        saveRecipes(adminData.recipes);
        setHistory(localHistory);
        setIsReadOnly(true); // 使用 admin 数据，设为只读
        return;
      }
    }

    setMaterials(localMaterials);
    setRecipes(localRecipes);
    setHistory(localHistory);
  };

  const refreshData = async () => {
    const localHistory = getHistory();
    
    // 检查是否登录
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (currentUserId) {
      // 登录用户：从 Supabase 同步最新数据
      const userData = await getUserDataFromDB(currentUserId);
      setMaterials(userData.materials);
      setRecipes(userData.recipes);
      saveMaterials(userData.materials);
      saveRecipes(userData.recipes);
      setHistory(localHistory);
      setIsReadOnly(false);
      return;
    }

    // 未登录用户，使用本地数据
    const localMaterials = getMaterials();
    const localRecipes = getRecipes();
    
    if (localMaterials.length > 0 || localRecipes.length > 0) {
      setIsReadOnly(false);
    }
    
    setMaterials(localMaterials);
    setRecipes(localRecipes);
    setHistory(localHistory);
  };

  return (
    <div className={cn("min-h-screen", isDark ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100")}>
      {/* Header */}
      <header className={cn("shadow-sm border-b backdrop-blur-xl", isDark ? "bg-slate-900/70 border-slate-700/50" : "bg-white/70 border-gray-200/50")}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-800")}>
                Minecraft 配方计算器
              </h1>
              <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-gray-500")}>
                {VERSION} · {BUILD_TIME}
              </p>
            </div>
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
            onCalculated={refreshData}
            isDark={isDark}
          />
        )}
        {activeTab === 'materials' && (
          <MaterialsView 
            materials={materials} 
            onMaterialsChange={refreshData}
            isDark={isDark}
            isReadOnly={isReadOnly}
          />
        )}
        {activeTab === 'recipes' && (
          <RecipesView 
            materials={materials}
            recipes={recipes}
            onRecipesChange={refreshData}
            isDark={isDark}
            isReadOnly={isReadOnly}
          />
        )}
        {activeTab === 'history' && (
          <HistoryView 
            history={history}
            onHistoryChange={refreshData}
            isDark={isDark}
          />
        )}
        {activeTab === 'settings' && (
          <UserSettingsView isDark={isDark} />
        )}
      </main>
    </div>
  );
}

// ============ 配方计算视图 ============
function CalculatorView({ materials, recipes, onCalculated, isDark }: { 
  materials: Material[]; 
  recipes: Recipe[];
  onCalculated: () => void;
  isDark: boolean;
}) {
  // 从localStorage读取保存的状态
  const [targets, setTargets] = useState<TargetMaterial[]>(() => {
    const saved = localStorage.getItem('calcTargets');
    return saved ? JSON.parse(saved) : [{ id: '1', recipeId: '', quantity: 1 }];
  });
  const [results, setResults] = useState<MaterialRequirement[]>(() => {
    const saved = localStorage.getItem('calcResults');
    return saved ? JSON.parse(saved) : [];
  });
  const [expandedResults, setExpandedResults] = useState<ExpandedRequirement[]>(() => {
    const saved = localStorage.getItem('calcExpandedResults');
    return saved ? JSON.parse(saved) : [];
  });
  const [showResults, setShowResults] = useState(() => {
    const saved = localStorage.getItem('calcShowResults');
    return saved ? saved === 'true' : false;
  });

  // 状态变化时保存到localStorage
  useEffect(() => {
    localStorage.setItem('calcTargets', JSON.stringify(targets));
  }, [targets]);

  useEffect(() => {
    localStorage.setItem('calcResults', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    localStorage.setItem('calcExpandedResults', JSON.stringify(expandedResults));
  }, [expandedResults]);

  useEffect(() => {
    localStorage.setItem('calcShowResults', String(showResults));
  }, [showResults]);

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
  };

  // 更新目标材料
  const updateTarget = (id: string, field: 'recipeId' | 'quantity', value: string | number) => {
    setTargets(targets.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  // 计算所有目标材料的总需求
  const handleCalculate = () => {
    const validTargets = targets.filter(t => t.recipeId && t.quantity > 0);
    if (validTargets.length === 0) return;

    const configs = validTargets.map(t => ({
      recipeId: t.recipeId,
      quantity: t.quantity,
    }));

    const result = performCalculation(configs);
    if (result) {
      setResults(result.results);
      setExpandedResults(result.expandedResults);
      setShowResults(true);
      onCalculated();
    }
  };

  const handleReset = () => {
    setTargets([{ id: '1', recipeId: '', quantity: 1 }]);
    setResults([]);
    setExpandedResults([]);
    setShowResults(false);
  };

  const cardClass = cn("rounded-xl p-6 backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className="space-y-5">
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
            添加目标
          </button>
        </div>
        
        <div className="space-y-3">
          {targets.map((target, index) => {
            const recipe = recipes.find(r => r.id === target.recipeId);
            
            return (
              <div key={target.id}>
                <div className={cn("flex gap-3 items-end p-3 rounded-lg", isDark ? "bg-slate-700" : "bg-gray-50")}>
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
                          {recipe.name} → {recipe.outputQuantity}个
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
                
                {/* 配方预览 */}
                {recipe && (
                  <div className={cn("mt-2 p-3 rounded-lg text-sm", isDark ? "bg-slate-800/80" : "bg-white")}>
                    <div className="text-xs mb-2 text-slate-500">
                      {recipe.ingredients.map((ing, i) => (
                        <span key={i}>{ing.materialName}×{ing.quantity}{i < recipe.ingredients.length - 1 ? ' + ' : ''}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

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
                {targets.filter(t => t.recipeId).length} 种配方 → {results.length} 种材料
              </p>
            </div>
            <button
              onClick={() => downloadCSV(results)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
                isDark ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-green-600 text-white hover:bg-green-700"
              )}
            >
              <Download size={16} />
              导出
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={cn("border-b", isDark ? "border-slate-700" : "border-gray-200")}>
                  <th className={cn("text-left py-2 px-3 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>材料</th>
                  <th className={cn("text-right py-2 px-3 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>总数量</th>
                  <th className={cn("text-left py-2 px-3 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>用途明细</th>
                </tr>
              </thead>
              <tbody>
                {expandedResults.map((req) => {
                  return (
                    <tr key={req.materialId} className={cn("border-b", isDark ? "border-slate-700" : "border-gray-100")}>
                      <td className={cn("py-2 px-3 font-medium", isDark ? "text-slate-200" : "text-gray-800")}>
                        {req.materialName}
                      </td>
                      <td className={cn("py-2 px-3 text-right align-top", 
                        req.totalQuantity > 64 ? (isDark ? "text-purple-400" : "text-purple-600") : (isDark ? "text-blue-400" : "text-blue-600")
                      )}>
                        <span className="font-semibold">{req.totalQuantity}</span>
                      </td>
                      <td className={cn("py-2 px-3 text-xs", isDark ? "text-slate-400" : "text-gray-500")}>
                        {req.usageDetails?.map((usage, idx) => {
                          // 如果中间产物就是最终产物，说明没有中间步骤（直接合成）
                          const hasIntermediate = usage.intermediate && usage.intermediate !== usage.forItem && usage.intermediate !== req.materialName;
                          
                          return (
                            <div key={idx} className="mb-1">
                              其中<span className="font-medium">{usage.qty}</span>个
                              {hasIntermediate ? (
                                <>
                                  →做<span className="font-medium">{usage.intermediateQty}</span>个{usage.intermediate}
                                  →做成<span className="font-medium">{usage.forQty}</span>个{usage.forItem}
                                </>
                              ) : (
                                <>
                                  →做成<span className="font-medium">{usage.forQty}</span>个{usage.forItem}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showResults && results.length === 0 && (
        <div className={cn("rounded-lg p-10 text-center", cardClass)}>
          <Calculator className={cn("mx-auto", isDark ? "text-slate-600" : "text-gray-300")} size={40} />
          <p className={cn("mt-3", isDark ? "text-slate-400" : "text-gray-500")}>没有找到任何原材料需求</p>
        </div>
      )}
    </div>
  );
}

// ============ 物品管理视图 ============
function MaterialsView({ materials, onMaterialsChange, isDark, isReadOnly }: { 
  materials: Material[];
  onMaterialsChange: () => void;
  isDark: boolean;
  isReadOnly?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: '个', isRawMaterial: false });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMaterials = materials.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const trimmedName = formData.name.trim();
    const isDuplicate = materials.some(m => 
      m.name.trim().toLowerCase() === trimmedName.toLowerCase() && m.id !== editingId
    );
    if (isDuplicate) {
      alert(`物品"${trimmedName}"已存在！`);
      return;
    }

    if (editingId) {
      updateMaterial(editingId, { name: trimmedName, unit: formData.unit, isRawMaterial: formData.isRawMaterial });
      setEditingId(null);
    } else {
      const newMaterial: Material = {
        id: generateId(),
        name: trimmedName,
        unit: formData.unit,
        isRawMaterial: formData.isRawMaterial,
        createdAt: Date.now(),
      };
      addMaterial(newMaterial);
    }

    setFormData({ name: '', unit: '个', isRawMaterial: false });
    setShowForm(false);
    onMaterialsChange();
  };

  const handleEdit = (material: Material) => {
    setFormData({ name: material.name, unit: material.unit, isRawMaterial: material.isRawMaterial });
    setEditingId(material.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个物品吗？')) {
      deleteMaterial(id);
      onMaterialsChange();
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', unit: '个', isRawMaterial: false });
    setEditingId(null);
    setShowForm(false);
  };

  const toggleRawMaterial = (material: Material) => {
    updateMaterial(material.id, { isRawMaterial: !material.isRawMaterial });
    onMaterialsChange();
  };

  const cardClass = cn("rounded-xl backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className="space-y-5">
      <div className={cn("rounded-xl p-4", cardClass)}>
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
            disabled={isReadOnly}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-base",
              isReadOnly 
                ? (isDark ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-gray-400 text-gray-200 cursor-not-allowed")
                : (isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700")
            )}
          >
            <Plus size={18} />
            {isReadOnly ? '只读' : '添加'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className={cn("rounded-xl p-6", cardClass)}>
          <h3 className={cn("font-semibold mb-4", isDark ? "text-white" : "text-gray-800")}>
            {editingId ? '编辑物品' : '添加新物品'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm", 
                    isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                  )}
                  placeholder="物品名称"
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
            </div>
            
            {/* 原材料开关 */}
            <div className={cn("flex items-center gap-3 p-3 rounded-lg", isDark ? "bg-slate-700/50" : "bg-gray-50")}>
              <span className={cn("text-sm", isDark ? "text-slate-300" : "text-gray-700")}>
                标记为原材料（计算时不拆解）
              </span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isRawMaterial: !formData.isRawMaterial })}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  formData.isRawMaterial ? "bg-green-500" : isDark ? "bg-slate-500" : "bg-gray-300"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                  formData.isRawMaterial ? "left-6" : "left-0.5"
                )} />
              </button>
              <span className={cn("text-xs", isDark ? "text-slate-400" : "text-gray-500")}>
                {formData.isRawMaterial ? '开启' : '关闭'}
              </span>
            </div>

            <div className="flex gap-3">
              <button type="submit" className={cn("px-4 py-2 rounded-lg text-sm", isDark ? "bg-blue-500 text-white" : "bg-blue-600 text-white")}>
                <Save size={16} className="inline mr-1" />
                保存
              </button>
              <button type="button" onClick={handleCancel} className={cn("px-4 py-2 rounded-lg text-sm", isDark ? "border border-slate-600 text-slate-300" : "border border-gray-300")}>
                <X size={16} className="inline mr-1" />
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={cn("rounded-xl overflow-hidden", cardClass)}>
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
                <th className={cn("text-center py-2.5 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>单位</th>
                <th className={cn("text-center py-2.5 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>原材料</th>
                <th className={cn("text-right py-2.5 px-4 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map(material => (
                <tr key={material.id} className={cn("border-t", isDark ? "border-slate-700" : "border-gray-100")}>
                  <td className={cn("py-2.5 px-4 font-medium", isDark ? "text-slate-200" : "text-gray-800")}>{material.name}</td>
                  <td className={cn("py-2.5 px-4 text-center", isDark ? "text-slate-400" : "text-gray-500")}>{material.unit}</td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => toggleRawMaterial(material)}
                      className={cn(
                        "relative w-10 h-5 rounded-full transition-colors inline-block",
                        material.isRawMaterial ? "bg-green-500" : isDark ? "bg-slate-500" : "bg-gray-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                        material.isRawMaterial ? "left-5" : "left-0.5"
                      )} />
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {!isReadOnly && (
                      <>
                        <button onClick={() => handleEdit(material)} className={cn("p-1.5 rounded", isDark ? "text-blue-400 hover:bg-slate-700" : "text-blue-600 hover:bg-blue-50")}>
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(material.id)} className={cn("p-1.5 rounded", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-red-50")}>
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
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

// ============ 配方管理视图 ============
function RecipesView({ materials, recipes, onRecipesChange, isDark, isReadOnly }: {
  materials: Material[];
  recipes: Recipe[];
  onRecipesChange: () => void;
  isDark: boolean;
  isReadOnly?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    outputQuantity: 1,
    ingredients: [{ materialName: '', quantity: 1 }] as { materialName: string; quantity: number }[],
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 快速创建物品
  const quickCreateMaterial = (name: string, isRaw: boolean = false) => {
    const existing = materials.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    
    const newMaterial: Material = {
      id: generateId(),
      name: name.trim(),
      unit: '个',
      isRawMaterial: isRaw,
      createdAt: Date.now(),
    };
    addMaterial(newMaterial);
    return newMaterial;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const trimmedName = formData.name.trim();
    const isNameDuplicate = recipes.some(r => 
      r.name.trim().toLowerCase() === trimmedName.toLowerCase() && r.id !== editingId
    );
    if (isNameDuplicate) {
      alert(`配方"${trimmedName}"已存在！`);
      return;
    }

    // 快速创建输出物品（如果不是原材料）
    quickCreateMaterial(trimmedName, false);

    // 处理原材料：输入名称自动创建
    const validIngredients = formData.ingredients
      .filter(ing => ing.materialName.trim() && ing.quantity > 0)
      .map(ing => {
        const matName = ing.materialName.trim();
        quickCreateMaterial(matName, false);
        return {
          materialId: matName, // 用名称作为ID
          materialName: matName,
          quantity: ing.quantity,
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
      ingredients: [{ materialName: '', quantity: 1 }],
    });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (recipe: Recipe) => {
    setFormData({
      name: recipe.name,
      outputQuantity: recipe.outputQuantity,
      ingredients: recipe.ingredients.map(ing => ({
        materialName: ing.materialName,
        quantity: ing.quantity,
      })),
    });
    setEditingId(recipe.id);
    setShowForm(true);
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
        ingredients: [...formData.ingredients, { materialName: '', quantity: 1 }],
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

  const updateIngredient = (index: number, field: 'materialName' | 'quantity', value: string | number) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const cardClass = cn("rounded-xl backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className="space-y-5">
      <div className={cn("rounded-xl p-4", cardClass)}>
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
            disabled={isReadOnly}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-base",
              isReadOnly 
                ? (isDark ? "bg-slate-600 text-slate-400 cursor-not-allowed" : "bg-gray-400 text-gray-200 cursor-not-allowed")
                : (isDark ? "bg-blue-500 text-white hover:bg-blue-600" : "bg-blue-600 text-white hover:bg-blue-700")
            )}
          >
            <Plus size={18} />
            {isReadOnly ? '只读' : '添加配方'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className={cn("rounded-xl p-6", cardClass)}>
          <h3 className={cn("font-semibold mb-4", isDark ? "text-white" : "text-gray-800")}>
            {editingId ? '编辑配方' : '添加配方（输入名称自动创建物品）'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cn("block text-xs mb-1", isDark ? "text-slate-400" : "text-gray-500")}>产出物品</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm", 
                    isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                  )}
                  placeholder="输入名称"
                />
              </div>
              <div>
                <label className={cn("block text-xs mb-1", isDark ? "text-slate-400" : "text-gray-500")}>产出数量</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.outputQuantity}
                  onChange={e => setFormData({ ...formData, outputQuantity: parseInt(e.target.value) || 1 })}
                  className={cn("w-full px-3 py-2 rounded-lg text-sm", 
                    isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                  )}
                  placeholder="数量"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={cn("block text-xs", isDark ? "text-slate-400" : "text-gray-500")}>原材料（输入名称）</label>
              {formData.ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={ing.materialName}
                    onChange={e => updateIngredient(index, 'materialName', e.target.value)}
                    className={cn("flex-1 px-3 py-2 rounded-lg text-sm", 
                      isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                    )}
                    placeholder="输入材料名称"
                    list="existing-materials"
                  />
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5,6,7,8,9].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => updateIngredient(index, 'quantity', num)}
                        className={cn("w-8 h-8 rounded text-sm font-medium transition-colors",
                          ing.quantity === num
                            ? isDark ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                            : isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
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
              ))}
              {formData.ingredients.length < 9 && (
                <button
                  type="button"
                  onClick={addIngredient}
                  className={cn("text-sm", isDark ? "text-blue-400" : "text-blue-600")}
                >
                  + 添加材料
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className={cn("px-4 py-2 rounded-lg text-sm", isDark ? "bg-blue-500 text-white" : "bg-blue-600 text-white")}>
                <Save size={15} className="inline mr-1" />
                保存
              </button>
              <button type="button" onClick={resetForm} className={cn("px-4 py-2 rounded-lg text-sm", isDark ? "border border-slate-600 text-slate-300" : "border border-gray-300")}>
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecipes.length === 0 ? (
          <div className={cn("col-span-2 rounded-xl p-12 text-center", cardClass)}>
            <BookOpen className={cn("mx-auto", isDark ? "text-slate-600" : "text-gray-300")} size={48} />
            <p className={cn("mt-4 text-lg", isDark ? "text-slate-400" : "text-gray-500")}>
              {searchTerm ? '没有找到' : '暂无配方'}
            </p>
            <p className={cn("mt-2 text-sm", isDark ? "text-slate-500" : "text-gray-400")}>
              点击「添加配方」开始创建
            </p>
          </div>
        ) : (
          filteredRecipes.map(recipe => (
            <div key={recipe.id} className={cn("rounded-xl p-5", cardClass)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={cn("text-lg font-semibold", isDark ? "text-white" : "text-gray-800")}>{recipe.name}</h3>
                  <p className={cn("text-sm mt-1", isDark ? "text-slate-400" : "text-gray-500")}>
                    {recipe.outputQuantity}个 = {recipe.ingredients.map(i => `${i.materialName}×${i.quantity}`).join(' + ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!isReadOnly && (
                    <>
                      <button onClick={() => handleEdit(recipe)} className={cn("p-2 rounded-lg", isDark ? "text-blue-400 hover:bg-slate-700" : "text-blue-600 hover:bg-blue-50")}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(recipe.id)} className={cn("p-2 rounded-lg", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-red-50")}>
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
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
function HistoryView({ history, onHistoryChange, isDark }: {
  history: CalculationHistory[];
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

  const cardClass = cn("rounded-xl backdrop-blur-xl", isDark ? "bg-slate-800/60 border border-slate-700/50" : "bg-white/70 border border-gray-200/50 shadow-lg");

  return (
    <div className="space-y-5">
      <div className={cn("rounded-xl p-4 flex items-center justify-between", cardClass)}>
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

      {history.length === 0 ? (
        <div className={cn("rounded-xl p-12 text-center", cardClass)}>
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
                      {record.summary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(record.id); }}
                    className={cn("p-2 rounded-lg", isDark ? "text-red-400 hover:bg-slate-700" : "text-red-600 hover:bg-red-50")}
                  >
                    <Trash2 size={18} />
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

              {selectedRecord === record.id && (
                <div className={cn("px-4 pb-4 pt-0 border-t", isDark ? "border-slate-700" : "border-gray-100")}>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className={cn("border-b", isDark ? "border-slate-700" : "border-gray-100")}>
                        <th className={cn("text-left py-2 px-2 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>材料</th>
                        <th className={cn("text-right py-2 px-2 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>数量</th>
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
