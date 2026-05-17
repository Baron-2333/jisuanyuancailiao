import { Material, Recipe, CalculationHistory } from '../types';

// 云开发数据库操作
// 需要先登录云开发环境才能使用

const DB_COLLECTIONS = {
  MATERIALS: 'materials',
  RECIPES: 'recipes',
  HISTORY: 'history',
};

// 检查是否已登录云开发
function isCloudBaseAvailable(): boolean {
  return typeof wx !== 'undefined' && wx.cloud;
}

// ============ 原材料管理 ============

export async function cloudGetMaterials(): Promise<Material[]> {
  if (!isCloudBaseAvailable()) return [];
  try {
    const db = wx.cloud.database();
    const { data } = await db.collection(DB_COLLECTIONS.MATERIALS).get();
    return data.map((item: any) => ({
      id: item._id,
      name: item.name,
      unit: item.unit,
      createdAt: item.createdAt,
    }));
  } catch (e) {
    console.error('cloudGetMaterials error:', e);
    return [];
  }
}

export async function cloudAddMaterial(material: Material): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  try {
    const db = wx.cloud.database();
    await db.collection(DB_COLLECTIONS.MATERIALS).add({
      data: {
        name: material.name,
        unit: material.unit,
        createdAt: material.createdAt,
      },
    });
  } catch (e) {
    console.error('cloudAddMaterial error:', e);
  }
}

export async function cloudUpdateMaterial(id: string, updates: Partial<Material>): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  try {
    const db = wx.cloud.database();
    await db.collection(DB_COLLECTIONS.MATERIALS).doc(id).update({
      data: updates,
    });
  } catch (e) {
    console.error('cloudUpdateMaterial error:', e);
  }
}

export async function cloudDeleteMaterial(id: string): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  try {
    const db = wx.cloud.database();
    await db.collection(DB_COLLECTIONS.MATERIALS).doc(id).remove();
  } catch (e) {
    console.error('cloudDeleteMaterial error:', e);
  }
}

// ============ 配方管理 ============

export async function cloudGetRecipes(): Promise<Recipe[]> {
  if (!isCloudBaseAvailable()) return [];
  try {
    const db = wx.cloud.database();
    const { data } = await db.collection(DB_COLLECTIONS.RECIPES).get();
    return data.map((item: any) => ({
      id: item._id,
      name: item.name,
      outputQuantity: item.outputQuantity,
      ingredients: item.ingredients,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  } catch (e) {
    console.error('cloudGetRecipes error:', e);
    return [];
  }
}

export async function cloudAddRecipe(recipe: Recipe): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  try {
    const db = wx.cloud.database();
    await db.collection(DB_COLLECTIONS.RECIPES).add({
      data: {
        name: recipe.name,
        outputQuantity: recipe.outputQuantity,
        ingredients: recipe.ingredients,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
      },
    });
  } catch (e) {
    console.error('cloudAddRecipe error:', e);
  }
}

export async function cloudUpdateRecipe(id: string, updates: Partial<Recipe>): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  try {
    const db = wx.cloud.database();
    await db.collection(DB_COLLECTIONS.RECIPES).doc(id).update({
      data: updates,
    });
  } catch (e) {
    console.error('cloudUpdateRecipe error:', e);
  }
}

export async function cloudDeleteRecipe(id: string): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  try {
    const db = wx.cloud.database();
    await db.collection(DB_COLLECTIONS.RECIPES).doc(id).remove();
  } catch (e) {
    console.error('cloudDeleteRecipe error:', e);
  }
}

// ============ 历史记录管理 ============

export async function cloudGetHistory(): Promise<CalculationHistory[]> {
  if (!isCloudBaseAvailable()) return [];
  try {
    const db = wx.cloud.database();
    const { data } = await db.collection(DB_COLLECTIONS.HISTORY)
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    return data.map((item: any) => ({
      id: item._id,
      timestamp: item.timestamp,
      summary: item.summary,
      targets: item.targets,
      results: item.results,
    }));
  } catch (e) {
    console.error('cloudGetHistory error:', e);
    return [];
  }
}

export async function cloudAddHistory(record: CalculationHistory): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  try {
    const db = wx.cloud.database();
    await db.collection(DB_COLLECTIONS.HISTORY).add({
      data: {
        timestamp: record.timestamp,
        summary: record.summary,
        targets: record.targets,
        results: record.results,
      },
    });
  } catch (e) {
    console.error('cloudAddHistory error:', e);
  }
}

export async function cloudDeleteHistoryItem(id: string): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  try {
    const db = wx.cloud.database();
    await db.collection(DB_COLLECTIONS.HISTORY).doc(id).remove();
  } catch (e) {
    console.error('cloudDeleteHistoryItem error:', e);
  }
}

export async function cloudClearHistory(): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  try {
    const db = wx.cloud.database();
    // 获取所有记录并删除
    const { data } = await db.collection(DB_COLLECTIONS.HISTORY).get();
    for (const item of data) {
      await db.collection(DB_COLLECTIONS.HISTORY).doc(item._id).remove();
    }
  } catch (e) {
    console.error('cloudClearHistory error:', e);
  }
}

// 同步本地数据到云端
export async function syncLocalToCloud(
  materials: Material[],
  recipes: Recipe[],
  history: CalculationHistory[]
): Promise<void> {
  if (!isCloudBaseAvailable()) return;
  
  // 批量上传原材料
  for (const m of materials) {
    await cloudAddMaterial(m);
  }
  
  // 批量上传配方
  for (const r of recipes) {
    await cloudAddRecipe(r);
  }
  
  // 批量上传历史记录
  for (const h of history) {
    await cloudAddHistory(h);
  }
}
