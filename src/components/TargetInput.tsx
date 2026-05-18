/**
 * 单个目标输入行组件
 */
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../utils/utils';
import { Recipe } from '../types';

interface TargetInputProps {
  target: {
    id: string;
    recipeId: string;
    quantity: number;
  };
  index: number;
  recipes: Recipe[];
  onUpdate: (id: string, field: 'recipeId' | 'quantity', value: string | number) => void;
  onRemove: (id: string) => void;
}

export function TargetInput({ target, index, recipes, onUpdate, onRemove }: TargetInputProps) {
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
    <div>
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
                onUpdate(target.id, 'recipeId', matched.id);
              } else {
                onUpdate(target.id, 'recipeId', '');
              }
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-[#1e1e2e] text-white border border-[#2a2a3e]"
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
                    onUpdate(target.id, 'recipeId', r.id);
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
            onChange={e => onUpdate(target.id, 'quantity', parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-lg text-sm text-center bg-[#1e1e2e] text-white border border-[#2a2a3e]"
          />
        </div>
        <button
          onClick={() => onRemove(target.id)}
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
}
