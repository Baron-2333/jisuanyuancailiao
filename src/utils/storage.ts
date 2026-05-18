import { Material, Recipe, CalculationHistory } from '../types';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  MATERIALS: 'minecraft_calculator_materials',
  RECIPES: 'minecraft_calculator_recipes',
  HISTORY: 'minecraft_calculator_history',
};

// 通用存储函数
function getStorageData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageData<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// 同步数据到 Supabase（登录用户）
async function syncToSupabase(key: 'MATERIALS' | 'RECIPES', data: Material[] | Recipe[]): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;

    const settingKey = key === 'MATERIALS' ? 'materials' : 'recipes';
    
    // 先尝试 UPDATE
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        setting_value: JSON.stringify(data),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('setting_key', settingKey);

    if (updateError) {
      alert(`保存失败: ${updateError.message}`);
      console.error(`UPDATE ${key} 失败:`, updateError);
      // 如果 UPDATE 影响 0 行，尝试 INSERT
      if (updateError.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            setting_key: settingKey,
            setting_value: JSON.stringify(data),
            is_admin: false,
          });
        
        if (insertError) {
          alert(`插入失败: ${insertError.message}`);
          console.error(`INSERT ${key} 失败:`, insertError);
        }
      }
    } else {
      console.log(`[保存成功] ${key}:`, data.length, '条');
    }
  } catch (e) {
    console.error('同步到 Supabase 异常:', e);
    alert(`保存异常: ${e}`);
  }
}

// 原材料管理
export function getMaterials(): Material[] {
  return getStorageData<Material[]>(STORAGE_KEYS.MATERIALS, []);
}

export function saveMaterials(materials: Material[]): void {
  setStorageData(STORAGE_KEYS.MATERIALS, materials);
  // 同步到 Supabase
  syncToSupabase('MATERIALS', materials);
}

export function addMaterial(material: Material): void {
  const materials = getMaterials();
  materials.push(material);
  saveMaterials(materials);
}

export function updateMaterial(id: string, updates: Partial<Material>): void {
  const materials = getMaterials();
  const index = materials.findIndex(m => m.id === id);
  if (index !== -1) {
    materials[index] = { ...materials[index], ...updates };
    saveMaterials(materials);
  }
}

export function deleteMaterial(id: string): void {
  const materials = getMaterials().filter(m => m.id !== id);
  saveMaterials(materials);
}

// 配方管理
export function getRecipes(): Recipe[] {
  return getStorageData<Recipe[]>(STORAGE_KEYS.RECIPES, []);
}

export function saveRecipes(recipes: Recipe[]): void {
  setStorageData(STORAGE_KEYS.RECIPES, recipes);
  // 同步到 Supabase
  syncToSupabase('RECIPES', recipes);
}

export function addRecipe(recipe: Recipe): void {
  const recipes = getRecipes();
  recipes.push(recipe);
  saveRecipes(recipes);
}

export function updateRecipe(id: string, updates: Partial<Recipe>): void {
  const recipes = getRecipes();
  const index = recipes.findIndex(r => r.id === id);
  if (index !== -1) {
    recipes[index] = { ...recipes[index], ...updates, updatedAt: Date.now() };
    saveRecipes(recipes);
  }
}

export function deleteRecipe(id: string): void {
  const recipes = getRecipes().filter(r => r.id !== id);
  saveRecipes(recipes);
}

export function removeIngredientFromRecipe(recipeId: string, materialId: string): void {
  const recipes = getRecipes();
  const index = recipes.findIndex(r => r.id === recipeId);
  if (index !== -1) {
    recipes[index].ingredients = recipes[index].ingredients.filter(i => i.materialId !== materialId);
    recipes[index].updatedAt = Date.now();
    saveRecipes(recipes);
  }
}

// 历史记录管理
export function getHistory(): CalculationHistory[] {
  return getStorageData<CalculationHistory[]>(STORAGE_KEYS.HISTORY, []);
}

export function saveHistory(history: CalculationHistory[]): void {
  setStorageData(STORAGE_KEYS.HISTORY, history);
}

export function addHistory(record: CalculationHistory): void {
  const history = getHistory();
  history.unshift(record);
  if (history.length > 100) {
    history.pop();
  }
  saveHistory(history);
}

export function clearHistory(): void {
  saveHistory([]);
}

export function deleteHistoryItem(id: string): void {
  const history = getHistory().filter(h => h.id !== id);
  saveHistory(history);
}

// 工具函数：生成唯一ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
