/**
 * 配方管理视图
 */
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, BookOpen } from 'lucide-react';
import { cn } from '../utils/utils';
import { addRecipe, updateRecipe, deleteRecipe, addMaterial, generateId } from '../utils/storage';
import { getPinyin } from '../types';
import { Material, Recipe } from '../types';

interface RecipesViewProps {
  materials: Material[];
  recipes: Recipe[];
  onRecipesChange: () => void;
  isReadOnly?: boolean;
}

export function RecipesView({ materials, recipes, onRecipesChange, isReadOnly }: RecipesViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    outputQuantity: 1,
    ingredients: [{ materialName: '', quantity: 1 }] as { materialName: string; quantity: number }[],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');

  // 获取所有可用的材料列表（用于筛选）
  const allMaterials = materials.filter(m =>
    recipes.some(r => r.ingredients.some(ing => ing.materialName === m.name))
  );

  // 筛选配方
  const filteredRecipes = recipes.filter(r => {
    const nameMatch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
    const materialMatch = !filterMaterial || r.ingredients.some(
      ing => ing.materialName === filterMaterial
    );
    return nameMatch && materialMatch;
  });

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
          materialId: matName,
          materialName: matName,
          quantity: ing.quantity,
        };
      });

    if (validIngredients.length === 0) return;

    if (editingId) {
      updateRecipe(editingId, {
        name: trimmedName,
        pinyin: getPinyin(trimmedName),
        outputQuantity: formData.outputQuantity,
        ingredients: validIngredients,
      });
      setEditingId(null);
    } else {
      const newRecipe: Recipe = {
        id: generateId(),
        name: trimmedName,
        pinyin: getPinyin(trimmedName),
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

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4 bg-[#13131f] border border-[#1e1e2e]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="搜索配方..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-4 py-2.5 rounded-lg text-base bg-[#1a1a2e]/80 text-white border-[#2a2a3e] placeholder-slate-400"
            />
            <select
              value={filterMaterial}
              onChange={e => setFilterMaterial(e.target.value)}
              className="px-4 py-2.5 rounded-lg text-base bg-[#1a1a2e]/80 text-white border-[#2a2a3e]"
            >
              <option value="">全部材料</option>
              {allMaterials.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
            <span className="text-base text-slate-400">
              {filteredRecipes.length} 个配方
            </span>
            {filterMaterial && (
              <button
                onClick={() => setFilterMaterial('')}
                className="text-sm px-2 py-1 rounded text-indigo-400 hover:bg-[#1a1a2e]"
              >
                清除筛选
              </button>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            disabled={isReadOnly}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-base",
              isReadOnly
                ? "bg-[#1e1e2e] text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-600"
            )}
          >
            <Plus size={18} />
            {isReadOnly ? '只读' : '添加配方'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl p-6 bg-[#13131f] border border-[#1e1e2e]">
          <h3 className="font-semibold mb-4 text-white">
            {editingId ? '编辑配方' : '添加配方（输入名称自动创建物品）'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-slate-400">产出物品</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                  placeholder="输入名称"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-slate-400">产出数量</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.outputQuantity}
                  onChange={e => setFormData({ ...formData, outputQuantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                  placeholder="数量"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">原材料（输入名称）</label>
              {formData.ingredients.map((ing, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={ing.materialName}
                    onChange={e => updateIngredient(index, 'materialName', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                    placeholder="输入材料名称"
                  />
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5,6,7,8,9].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => updateIngredient(index, 'quantity', num)}
                        className={cn(
                          "w-8 h-8 rounded text-sm font-medium transition-colors",
                          ing.quantity === num
                            ? "bg-indigo-600 text-white"
                            : "bg-[#1a1a2e] text-slate-300 hover:bg-[#1e1e2e]"
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
                      className="p-1.5 rounded text-red-400 hover:bg-[#1a1a2e]"
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
                  className="text-sm text-indigo-400"
                >
                  + 添加材料
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white">
                <Save size={15} className="inline mr-1" />
                保存
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg text-sm border border-[#2a2a3e] text-slate-300">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRecipes.length === 0 ? (
          <div className="col-span-2 rounded-xl p-12 text-center bg-[#13131f] border border-[#1e1e2e]">
            <BookOpen className="mx-auto text-slate-600" size={48} />
            <p className="mt-4 text-lg text-slate-400">
              {searchTerm ? '没有找到' : '暂无配方'}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              点击「添加配方」开始创建
            </p>
          </div>
        ) : (
          filteredRecipes.map(recipe => (
            <div key={recipe.id} className="rounded-xl p-5 bg-[#13131f] border border-[#1e1e2e]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{recipe.name}</h3>
                  <p className="text-sm mt-1 text-slate-400">
                    {recipe.outputQuantity}个 = {recipe.ingredients.map(i => `${i.materialName}×${i.quantity}`).join(' + ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!isReadOnly && (
                    <>
                      <button onClick={() => handleEdit(recipe)} className="p-2 rounded-lg text-indigo-400 hover:bg-[#1a1a2e]">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(recipe.id)} className="p-2 rounded-lg text-red-400 hover:bg-[#1a1a2e]">
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
