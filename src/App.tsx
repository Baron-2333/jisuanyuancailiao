import { useState, useEffect, useCallback } from 'react';
import { Calculator, Package, BookOpen, History, Plus, Trash2, Edit2, Save, X, Download, RefreshCw, ChevronRight, Sun, Moon, Cog } from 'lucide-react';
import { cn } from './utils/utils';
import { getMaterials, getRecipes, getHistory, saveMaterials, saveRecipes, addMaterial, addRecipe, deleteMaterial, deleteRecipe, updateMaterial, updateRecipe, clearHistory, deleteHistoryItem, generateId, getSavedCalculation, saveCalculation, removeIngredientFromRecipe, getProcessSteps, addProcessStep, updateProcessStep, deleteProcessStep } from './utils/storage';
import { performCalculation, exportToCSV, downloadCSV, calculateRequirements, TargetConfig, calculateExpandedRequirements, ExpandedRequirement } from './utils/calculator';
import { Material, Recipe, CalculationHistory, MaterialRequirement, RecipeIngredient, ProcessStep } from './types';

// Tab类型
type TabType = 'calculator' | 'materials' | 'processes' | 'recipes' | 'history';

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

  // 加载数据
  useEffect(() => {
    setMaterials(getMaterials());
    setProcessSteps(getProcessSteps());
    setRecipes(getRecipes());
    setHistory(getHistory());
    const saved = getSavedCalculation();
    if (saved) setSavedCalc(saved);
  }, []);

  // 刷新数据
  const refreshData = useCallback(() => {
    setMaterials(getMaterials());
    setProcessSteps(getProcessSteps());
    setRecipes(getRecipes());
    setHistory(getHistory());
  }, []);

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
      {/* Header */}
      <header className={cn("shadow-sm border-b backdrop-blur-xl", isDark ? "bg-slate-900/70 border-slate-700/50" : "bg-white/70 border-gray-200/50")}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className={cn("text-2xl font-bold", isDark ? "text-white" : "text-gray-800")}>原材料计算器</h1>
          <p className={cn("text-base mt-1", isDark ? "text-slate-400" : "text-gray-500")}>工业配方材料需求计算系统</p>
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
      </main>
    </div>
  );
}

// ============ 配方计算视图 ============
function CalculatorView({ materials, recipes, savedCalc, onCalculated, onSave, isDark }: { 
  materials: Material[]; 
  recipes: Recipe[];
  savedCalc: SavedCalculation | null;
  onCalculated: () => void;
  onSave: (targets: TargetMaterial[], results: MaterialRequirement[]) => void;
  isDark: boolean;
}) {
  const [targets, setTargets] = useState<TargetMaterial[]>(
    savedCalc?.targets?.length ? savedCalc.targets : [{ id: '1', recipeId: '', quantity: 1 }]
  );
  const [results, setResults] = useState<MaterialRequirement[]>(savedCalc?.results || []);
  const [expandedResults, setExpandedResults] = useState<ExpandedRequirement[]>([]);
  const [showResults, setShowResults] = useState(savedCalc?.results?.length > 0);
  const [expandSubRecipes, setExpandSubRecipes] = useState(true); // 是否展开子配方
  // 单个配方的预览结果
  const [previewResults, setPreviewResults] = useState<Map<string, MaterialRequirement[]>>(new Map());

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

    const result = performCalculation(configs, expandSubRecipes);
    if (result) {
      setResults(result.results);
      setExpandedResults(result.expandedResults || []);
      setShowResults(true);
      onCalculated();
      onSave(targets, result.results);
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
    onSave([], []);
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
                    {expandSubRecipes ? (
                      // 展开模式：显示最终原材料和加工步骤
                      (() => {
                        const expanded = calculateExpandedRequirements(target.recipeId, target.quantity, recipes, materials);
                        return expanded.map((req, i) => (
                          <div key={i} className={cn("px-3 py-2 border-b last:border-0", isDark ? "border-slate-700" : "border-gray-100")}>
                            <div className="flex items-center justify-between">
                              <div className={isDark ? "text-slate-200" : "text-gray-700"}>{req.materialName}</div>
                              <div className={cn("font-medium", 
                                req.quantity > 64 ? (isDark ? "text-purple-400" : "text-purple-600") : (isDark ? "text-blue-400" : "text-blue-600")
                              )}>
                                {formatQuantity(req.quantity)}
                              </div>
                            </div>
                            <div className={cn("text-xs mt-1", isDark ? "text-slate-500" : "text-gray-400")}>
                              {req.steps.slice(0, -1).map((s, j) => (
                                <span key={j}>{s.recipeName}×{s.quantity}{j < req.steps.length - 2 ? ' → ' : ''}</span>
                              ))}
                            </div>
                          </div>
                        ));
                      })()
                    ) : (
                      // 不展开模式：显示直接原材料
                      recipe.ingredients.map((ing, i) => {
                        const totalReq = ing.quantity * target.quantity;
                        return (
                          <div key={i} className={cn("grid grid-cols-3 px-3 py-2 border-b last:border-0", isDark ? "border-slate-700" : "border-gray-100")}>
                            <div className={isDark ? "text-slate-200" : "text-gray-700"}>{ing.materialName}</div>
                            <div className={cn("text-center", isDark ? "text-slate-400" : "text-gray-500")}>×{ing.quantity}</div>
                            <div className={cn("text-center font-medium", 
                              totalReq > 64 ? (isDark ? "text-purple-400" : "text-purple-600") : (isDark ? "text-blue-400" : "text-blue-600")
                            )}>
                              {formatQuantity(totalReq)}
                            </div>
                          </div>
                        );
                      })
                    )}
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
                  {expandSubRecipes && <th className={cn("text-left py-2 px-3 font-medium", isDark ? "text-slate-400" : "text-gray-600")}>加工步骤</th>}
                </tr>
              </thead>
              <tbody>
                {results.map((req, idx) => {
                  const expReq = expandedResults[idx];
                  return (
                    <tr key={req.materialId} className={cn("border-b", isDark ? "border-slate-700" : "border-gray-100")}>
                      <td className={cn("py-2 px-3 font-medium", isDark ? "text-slate-200" : "text-gray-800")}>{req.materialName}</td>
                      <td className={cn("py-2 px-3 text-right font-semibold", 
                        req.totalQuantity > 64 ? (isDark ? "text-purple-400" : "text-purple-600") : (isDark ? "text-blue-400" : "text-blue-600")
                      )}>
                        {formatQuantity(req.totalQuantity)}
                      </td>
                      <td className={cn("py-2 px-3", isDark ? "text-slate-400" : "text-gray-500")}>{req.unit}</td>
                      {expandSubRecipes && (
                        <td className={cn("py-2 px-3 text-xs", isDark ? "text-slate-400" : "text-gray-500")}>
                          {expReq?.steps && expReq.steps.length > 0 ? (
                            <span className="text-blue-400">
                              {expReq.steps.map((s, i) => (
                                <span key={i}>{s.recipeName}×{s.quantity}{i < expReq.steps.length - 1 ? ' → ' : ''}</span>
                              ))}
                            </span>
                          ) : (
                            <span className={isDark ? "text-slate-500" : "text-gray-400"}>-</span>
                          )}
                        </td>
                      )}
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

    if (editingId) {
      updateMaterial(editingId, { name: formData.name.trim(), unit: formData.unit });
      setEditingId(null);
    } else {
      const newMaterial: Material = {
        id: generateId(),
        name: formData.name.trim(),
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

    if (editingId) {
      updateProcessStep(editingId, {
        inputs: validInputs.map(i => ({ name: i.name.trim(), quantity: i.quantity })),
        processName: formData.processName.trim(),
        outputs: validOutputs.map(o => ({ name: o.name.trim(), quantity: o.quantity })),
      });
      setEditingId(null);
    } else {
      const newStep: ProcessStep = {
        id: generateId(),
        inputs: validInputs.map(i => ({ name: i.name.trim(), quantity: i.quantity })),
        processName: formData.processName.trim(),
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
    setFormData({
      inputs: step.inputs.length > 0 ? step.inputs : [{ name: '', quantity: 1 }],
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
              {formData.inputs.map((input, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={input.name}
                    onChange={e => updateInput(index, 'name', e.target.value)}
                    className={cn("flex-1 px-3 py-2 rounded border text-sm", isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-gray-300")}
                    placeholder={`原材料${index + 1}名称`}
                  />
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
              ))}
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
function RecipesView({ materials, recipes, onRecipesChange, isDark }: {
  materials: Material[];
  recipes: Recipe[];
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

  const filteredRecipes = recipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.ingredients.length === 0) return;

    const validIngredients = formData.ingredients
      .filter(ing => ing.materialId && ing.quantity > 0)
      .map(ing => ({
        ...ing,
        materialName: materials.find(m => m.id === ing.materialId)?.name || '',
      }));

    if (validIngredients.length === 0) return;

    if (editingId) {
      updateRecipe(editingId, {
        name: formData.name.trim(),
        outputQuantity: formData.outputQuantity,
        ingredients: validIngredients,
      });
      setEditingId(null);
    } else {
      const newRecipe: Recipe = {
        id: generateId(),
        name: formData.name.trim(),
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
                  placeholder="配方名称"
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
              {formData.ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <select
                    value={ing.materialId}
                    onChange={e => updateIngredient(index, 'materialId', e.target.value)}
                    className={cn("flex-1 px-3 py-2 rounded-lg text-sm", 
                      isDark ? "bg-slate-700 text-white border-slate-600" : "border border-gray-300"
                    )}
                  >
                    <option value="">选择原材料...</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
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
              ))}
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
