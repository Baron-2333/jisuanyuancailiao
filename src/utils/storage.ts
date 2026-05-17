import { Material, Recipe, CalculationHistory, ProcessStep } from '../types';
import tcb from 'tcb-js-sdk';

// 环境配置
const ENV_ID = 'yuancailiao-d2gmuijr515f0420a';

// 初始化云开发
let app: any = null;
let db: any = null;

async function initCloud() {
  if (app) return;
  try {
    app = tcb.init({
      env: ENV_ID,
    });
    db = app.database();
  } catch (e) {
    console.error('Cloud init failed:', e);
  }
}

const STORAGE_KEYS = {
  MATERIALS: 'material_calculator_materials',
  RECIPES: 'material_calculator_recipes',
  HISTORY: 'material_calculator_history',
  PROCESS_STEPS: 'material_calculator_process_steps',
  CALCULATION: 'material_calculator_saved_calc',
  SYNC_KEY: 'material_calculator_last_sync',
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
  // 异步同步到云端
  syncToCloud('materials', 'add', material);
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
  syncToCloud('recipes', 'add', recipe);
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
  syncToCloud('history', 'add', record);
}

export function clearHistory(): void {
  saveHistory([]);
}

export function deleteHistoryItem(id: string): void {
  const history = getHistory().filter(h => h.id !== id);
  saveHistory(history);
}

// ============ 加工步骤管理 ============

// 迁移旧格式数据到新格式
function migrateProcessStep(oldStep: any): ProcessStep {
  // 如果已经是新格式，直接返回
  if (Array.isArray(oldStep.inputs)) {
    return oldStep as ProcessStep;
  }
  // 旧格式迁移
  return {
    id: oldStep.id || generateId(),
    inputs: [{ name: oldStep.inputName || '', quantity: oldStep.inputQuantity || 1 }],
    processName: oldStep.processName || '',
    outputs: [{ name: oldStep.outputName || '', quantity: oldStep.outputQuantity || 1 }],
    createdAt: oldStep.createdAt || Date.now(),
  };
}

export function getProcessSteps(): ProcessStep[] {
  const steps = getStorageData<ProcessStep[]>(STORAGE_KEYS.PROCESS_STEPS, []);
  // 迁移旧格式数据
  const migrated = steps.map(migrateProcessStep);
  // 如果有迁移发生，更新存储
  const hasMigration = migrated.some((step, i) => {
    const old = steps[i];
    return !Array.isArray(old?.inputs);
  });
  if (hasMigration) {
    saveProcessSteps(migrated);
  }
  return migrated;
}

export function saveProcessSteps(steps: ProcessStep[]): void {
  setStorageData(STORAGE_KEYS.PROCESS_STEPS, steps);
}

export function addProcessStep(step: ProcessStep): void {
  const steps = getProcessSteps();
  steps.push(step);
  saveProcessSteps(steps);
  syncToCloud('processSteps', 'add', step);
}

export function updateProcessStep(id: string, updates: Partial<ProcessStep>): void {
  const steps = getProcessSteps();
  const index = steps.findIndex(s => s.id === id);
  if (index !== -1) {
    steps[index] = { ...steps[index], ...updates };
    saveProcessSteps(steps);
  }
}

export function deleteProcessStep(id: string): void {
  const steps = getProcessSteps().filter(s => s.id !== id);
  saveProcessSteps(steps);
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

// ============ 云端同步功能 ============

let syncEnabled = false;

export async function enableCloudSync(): Promise<boolean> {
  try {
    await initCloud();
    // 尝试匿名登录
    await app.auth({ persistence: 'local' }).anonymousAuthProvider().signIn();
    syncEnabled = true;
    console.log('Cloud sync enabled');
    return true;
  } catch (e) {
    console.error('Enable cloud sync failed:', e);
    return false;
  }
}

async function syncToCloud(collection: string, action: string, data: any): Promise<void> {
  if (!syncEnabled) return;
  try {
    await app.callFunction({
      name: 'dataApi',
      data: { action, collection, data },
    });
  } catch (e) {
    console.error('Sync to cloud failed:', e);
  }
}

// 从云端拉取所有数据
export async function pullFromCloud(): Promise<void> {
  if (!syncEnabled) return;
  try {
    const [materialsRes, recipesRes, historyRes] = await Promise.all([
      app.callFunction({ name: 'dataApi', data: { action: 'get', collection: 'materials' } }),
      app.callFunction({ name: 'dataApi', data: { action: 'get', collection: 'recipes' } }),
      app.callFunction({ name: 'dataApi', data: { action: 'query', collection: 'history', query: { orderBy: { field: 'timestamp', order: 'desc' }, limit: 100 } } }),
    ]);

    if (materialsRes.result?.success) {
      const cloudMaterials = materialsRes.result.data.map((item: any) => ({
        id: item._id, name: item.name, unit: item.unit, createdAt: item.createdAt,
      }));
      saveMaterials(cloudMaterials);
    }

    if (recipesRes.result?.success) {
      const cloudRecipes = recipesRes.result.data.map((item: any) => ({
        id: item._id, name: item.name, outputQuantity: item.outputQuantity,
        ingredients: item.ingredients, createdAt: item.createdAt, updatedAt: item.updatedAt,
      }));
      saveRecipes(cloudRecipes);
    }

    if (historyRes.result?.success) {
      const cloudHistory = historyRes.result.data.map((item: any) => ({
        id: item._id, timestamp: item.timestamp, summary: item.summary,
        targets: item.targets, results: item.results,
      }));
      saveHistory(cloudHistory);
    }

    // 记录同步时间
    setStorageData(STORAGE_KEYS.SYNC_KEY, Date.now());
  } catch (e) {
    console.error('Pull from cloud failed:', e);
  }
}

// 同步到云端（完全覆盖）
export async function pushToCloud(): Promise<void> {
  if (!syncEnabled) return;
  try {
    // 先清空云端数据
    await app.callFunction({ name: 'dataApi', data: { action: 'clear', collection: 'materials' } });
    await app.callFunction({ name: 'dataApi', data: { action: 'clear', collection: 'recipes' } });
    await app.callFunction({ name: 'dataApi', data: { action: 'clear', collection: 'history' } });

    // 批量上传本地数据
    const materials = getMaterials();
    const recipes = getRecipes();
    const history = getHistory();

    for (const m of materials) {
      await syncToCloud('materials', 'add', m);
    }
    for (const r of recipes) {
      await syncToCloud('recipes', 'add', r);
    }
    for (const h of history) {
      await syncToCloud('history', 'add', h);
    }

    setStorageData(STORAGE_KEYS.SYNC_KEY, Date.now());
    console.log('Push to cloud completed');
  } catch (e) {
    console.error('Push to cloud failed:', e);
  }
}

// 检查是否已启用云同步
export function isCloudSyncEnabled(): boolean {
  return syncEnabled;
}
