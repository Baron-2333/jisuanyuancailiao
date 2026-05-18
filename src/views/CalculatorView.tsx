/**
 * 配方计算视图
 */
import { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, RefreshCw, Download } from 'lucide-react';
import { cn } from '../utils/utils';
import { performCalculation, downloadCSV } from '../utils/calculator';
import { getProcesses } from '../utils/storage';
import { Material, Recipe, MaterialRequirement, ExpandedRequirement } from '../types';

// 单个目标材料配置
interface TargetMaterial {
  id: string;
  recipeId: string;
  quantity: number;
}

interface CalculatorViewProps {
  materials: Material[];
  recipes: Recipe[];
  onCalculated: () => void;
}

export function CalculatorView({ materials, recipes, onCalculated }: CalculatorViewProps) {
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

  // 获取加工程序（用于展示追溯信息）
  const processes = getProcesses();

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

  const cardClass = "rounded-xl p-6 backdrop-blur-xl bg-[#13131f] border border-[#1e1e2e]";

  return (
    <div className="space-y-5">
      {/* 多目标材料输入 */}
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">配方计算</h2>
          <button
            onClick={addTarget}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-400 border border-indigo-500 hover:bg-[#1a1a2e] transition-colors"
          >
            <Plus size={16} />
            添加目标
          </button>
        </div>

        <div className="space-y-3">
          {targets.map((target, index) => {
            const recipe = recipes.find(r => r.id === target.recipeId);
            const [inputValue, setInputValue] = useState(recipe?.name || '');
            const [showDropdown, setShowDropdown] = useState(false);

            // 根据输入过滤匹配的配方
            const searchText = inputValue.toLowerCase().replace(/\s+/g, '');
            const filteredRecipes = inputValue.length > 0
              ? recipes.filter(r => {
                  const cleanPinyin = (r.pinyin || '').replace(/\s+/g, '').toLowerCase();
                  return r.name.toLowerCase().includes(searchText) ||
                    cleanPinyin.startsWith(searchText) ||
                    cleanPinyin.includes(searchText);
                }).slice(0, 8)
              : [];

            return (
              <div key={target.id}>
                <div className="flex gap-3 items-end p-3 rounded-lg bg-[#1a1a2e]">
                  <div className="flex items-center gap-2 text-slate-400 w-8">
                    <span className="font-medium text-sm">{index + 1}.</span>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="输入配方名称或拼音首字母..."
                      value={inputValue}
                      onChange={e => {
                        setInputValue(e.target.value);
                        setShowDropdown(true);
                        const searchText = e.target.value.toLowerCase();
                        const matched = recipes.find(r =>
                          r.name.toLowerCase().includes(searchText) ||
                          (r.pinyin && r.pinyin.toLowerCase().includes(searchText))
                        );
                        if (matched) {
                          updateTarget(target.id, 'recipeId', matched.id);
                        } else {
                          updateTarget(target.id, 'recipeId', '');
                        }
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-[#1e1e2e] text-white border-[#2a2a3e]"
                    />
                    {/* 自定义下拉联想菜单 */}
                    {showDropdown && filteredRecipes.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border overflow-hidden bg-[#1a1a2e] border-[#2a2a3e]">
                        {filteredRecipes.map(r => (
                          <button
                            key={r.id}
                            onClick={() => {
                              setInputValue(r.name);
                              setShowDropdown(false);
                              updateTarget(target.id, 'recipeId', r.id);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-[#1e1e2e] transition-colors text-white",
                              r.id === target.recipeId && "bg-[#1e1e2e]"
                            )}
                          >
                            {r.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={target.quantity}
                      onChange={e => updateTarget(target.id, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-center bg-[#1e1e2e] text-white border-[#2a2a3e]"
                    />
                  </div>
                  <button
                    onClick={() => removeTarget(target.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-[#1e1e2e] transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* 配方预览 */}
                {recipe && (
                  <div className="mt-2 p-3 rounded-lg text-sm bg-[#13131f]/80">
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
                ? "bg-indigo-600 text-white hover:bg-indigo-600"
                : "bg-[#1e1e2e] text-slate-400 cursor-not-allowed"
            )}
          >
            <Calculator size={16} />
            计算总需求
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#2a2a3e] text-slate-300 hover:bg-[#1a1a2e] transition-colors"
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
              <h2 className="text-lg font-semibold text-white">原材料总需求</h2>
              <p className="text-xs mt-1 text-slate-400">
                {targets.filter(t => t.recipeId).length} 种配方 → {results.length} 种材料
              </p>
            </div>
            <button
              onClick={() => downloadCSV(results)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Download size={16} />
              导出
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 font-medium text-slate-400">材料</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-400">总数量</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-400">用途明细</th>
                </tr>
              </thead>
              <tbody>
                {expandedResults.map((req) => {
                  return (
                    <tr key={req.materialId} className="border-b border-slate-700">
                      <td className="py-2 px-3 font-medium text-white">
                        {req.materialName}
                      </td>
                      <td className={cn("py-2 px-3 text-right align-top",
                        req.totalQuantity > 64 ? "text-purple-400" : "text-indigo-400"
                      )}>
                        <span className="font-semibold">
                          {req.totalQuantity >= 64 ? (
                            <>{Math.floor(req.totalQuantity / 64)}组+{req.totalQuantity % 64}</>
                          ) : (
                            req.totalQuantity
                          )}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-slate-400">
                        {req.usageDetails?.map((usage, idx) => {
                          const hasIntermediate = usage.intermediate && usage.intermediate !== usage.forItem && usage.intermediate !== req.materialName;
                          const traceProcess = hasIntermediate ? processes.find(p => p.outputName === usage.intermediate && p.traceEnabled) : null;

                          return (
                            <div key={idx} className="mb-1">
                              {traceProcess ? (
                                <span className="font-bold text-green-400">
                                  （通过{traceProcess.name}→做成{usage.intermediateQty}个{usage.intermediate}）
                                </span>
                              ) : hasIntermediate ? (
                                <span className="font-bold text-green-400">
                                  （→做{usage.intermediateQty}个{usage.intermediate}→做成{usage.forQty}个{usage.forItem}）
                                </span>
                              ) : (
                                <>
                                  <span className="font-bold text-red-400">其中{usage.qty}个</span>
                                  <span className="font-bold text-green-400">（→做成{usage.forQty}个{usage.forItem}）</span>
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
        <div className="rounded-lg p-10 text-center bg-[#13131f] border border-[#1e1e2e]">
          <Calculator className="mx-auto text-slate-600" size={40} />
          <p className="mt-3 text-slate-400">没有找到任何原材料需求</p>
        </div>
      )}
    </div>
  );
}
