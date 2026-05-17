import { Material, Recipe, CalculationHistory } from '../types';

const STORAGE_KEYS = {
  MATERIALS: 'material_calculator_materials',
  RECIPES: 'material_calculator_recipes',
  HISTORY: 'material_calculator_history',
  CALCULATION: 'material_calculator_saved_calc',
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

// 原材料管理
export function getMaterials(): Material[] {
  return getStorageData<Material[]>(STORAGE_KEYS.MATERIALS, []);
}

export function saveMaterials(materials: Material[]): void {
  setStorageData(STORAGE_KEYS.MATERIALS, materials);
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

// 从配方中移除某个原材料
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
  history.unshift(record); // 新记录在前
  // 最多保存100条记录
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

// 保存的计算状态类型
interface SavedCalculation {
  targets: { id: string; recipeId: string; quantity: number }[];
  results: { materialId: string; materialName: string; totalQuantity: number; unit: string }[];
  summary: string;
}

// 保存计算状态
export function saveCalculation(calc: SavedCalculation): void {
  setStorageData(STORAGE_KEYS.CALCULATION, calc);
}

// 读取保存的计算状态
export function getSavedCalculation(): SavedCalculation | null {
  return getStorageData<SavedCalculation | null>(STORAGE_KEYS.CALCULATION, null);
}
