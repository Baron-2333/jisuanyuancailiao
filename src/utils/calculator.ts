import { Recipe, Material, MaterialRequirement, TargetConfig, CalculationHistory, ExpandedRequirement, UsageDetail } from '../types';
import { getRecipes, getMaterials, addHistory, generateId, addMaterial } from './storage';

/**
 * 向上取整到最近的整数
 */
function ceilToInt(value: number): number {
  return Math.ceil(value);
}

// 用途记录类型
interface UsageRecord {
  quantity: number;
  craftCount: number;
  sources: Set<string>;
  usageDetails: UsageDetail[];
}

/**
 * 递归计算目标物品所需的原材料
 * @param targetItemName 目标物品名称
 * @param targetQty 需要的目标物品数量
 * @param forItem 用于什么物品的合成
 * @param recipes 所有配方
 * @param materials 所有物品
 * @param materialRequirements 累计的原材料需求
 */
function calculateForItem(
  targetItemName: string,
  targetQty: number,
  forItem: string,
  recipes: Recipe[],
  materials: Material[],
  materialRequirements: Map<string, UsageRecord>
): void {
  // 查找该物品是否是原材料（开启状态）
  const material = materials.find(m => m.name === targetItemName);
  
  if (material?.isRawMaterial) {
    // 如果是原材料，直接计入
    const existing = materialRequirements.get(targetItemName);
    if (existing) {
      existing.quantity += targetQty;
      existing.usageDetails.push({ forItem, forQty: targetQty, qty: targetQty });
    } else {
      materialRequirements.set(targetItemName, {
        quantity: targetQty,
        craftCount: 0,
        sources: new Set([forItem]),
        usageDetails: [{ forItem, forQty: targetQty, qty: targetQty }],
      });
    }
    return;
  }

  // 查找该物品的配方（通过配方名称匹配）
  const recipe = recipes.find(r => r.name === targetItemName);
  if (!recipe) {
    // 没有配方，将其作为不可拆解物品计入
    const existing = materialRequirements.get(targetItemName);
    if (existing) {
      existing.quantity += targetQty;
      existing.usageDetails.push({ forItem, forQty: targetQty, qty: targetQty });
    } else {
      materialRequirements.set(targetItemName, {
        quantity: targetQty,
        craftCount: 0,
        sources: new Set([forItem]),
        usageDetails: [{ forItem, forQty: targetQty, qty: targetQty }],
      });
    }
    return;
  }

  // 计算需要多少次合成（向上取整到合成次数）
  const craftCount = ceilToInt(targetQty / recipe.outputQuantity);

  // 遍历配方中的每个原材料
  for (const ingredient of recipe.ingredients) {
    const ingredientQtyNeeded = ingredient.quantity * craftCount;

    // 递归计算该原材料，传入当前物品名称作为用途标记
    calculateForItem(
      ingredient.materialName,
      ingredientQtyNeeded,
      targetItemName, // 记录用于什么物品
      recipes,
      materials,
      materialRequirements
    );
  }
}

/**
 * 执行批量计算
 */
export function performCalculation(
  targets: TargetConfig[]
): { results: MaterialRequirement[]; expandedResults: ExpandedRequirement[] } | null {
  if (targets.length === 0) return null;

  const recipes = getRecipes();
  const materials = getMaterials();
  
  // 累计的原材料需求
  const materialRequirements = new Map<string, UsageRecord>();

  // 记录每个目标物品的直接原材料
  const directTargets: { name: string; qty: number }[] = [];

  for (const target of targets) {
    const recipe = recipes.find(r => r.id === target.recipeId);
    if (!recipe) continue;

    const targetQty = target.quantity;
    const targetName = recipe.name;

    // 计算需要多少次合成
    const craftCount = ceilToInt(targetQty / recipe.outputQuantity);

    // 遍历配方中的每个原材料
    for (const ingredient of recipe.ingredients) {
      const ingredientQtyNeeded = ingredient.quantity * craftCount;

      // 递归计算，传入目标物品名称作为用途标记
      calculateForItem(
        ingredient.materialName,
        ingredientQtyNeeded,
        targetName,
        recipes,
        materials,
        materialRequirements
      );
    }
  }

  // 转换为结果数组
  const results: MaterialRequirement[] = [];
  const expandedResults: ExpandedRequirement[] = [];

  for (const [itemName, data] of materialRequirements) {
    const material = materials.find(m => m.name === itemName);
    const requirement: MaterialRequirement = {
      materialId: itemName,
      materialName: itemName,
      totalQuantity: data.quantity,
      unit: material?.unit || '个',
    };
    results.push(requirement);

    // 处理用途详情，合并相同用途
    const usageMap = new Map<string, number>();
    for (const usage of data.usageDetails) {
      const key = `${usage.forItem}×${usage.forQty}`;
      usageMap.set(key, (usageMap.get(key) || 0) + usage.qty);
    }
    
    const usageDetails: UsageDetail[] = [];
    for (const [key, qty] of usageMap) {
      const [forItem, forQtyStr] = key.split('×');
      usageDetails.push({ forItem, forQty: parseInt(forQtyStr), qty });
    }

    expandedResults.push({
      ...requirement,
      craftCount: data.craftCount,
      fromTargets: Array.from(data.sources),
      usageDetails,
    });
  }

  // 按名称排序
  results.sort((a, b) => a.materialName.localeCompare(b.materialName));
  expandedResults.sort((a, b) => a.materialName.localeCompare(b.materialName));

  // 保存历史记录
  const targetSummaries = targets.map(t => {
    const recipe = recipes.find(r => r.id === t.recipeId);
    return `${recipe?.name || ''}×${t.quantity}`;
  });

  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

  const historyRecord: CalculationHistory = {
    id: generateId(),
    timestamp: Date.now(),
    summary: `${targetSummaries.join(' + ')} - ${timeStr}`,
    targets: targets.map(t => {
      const recipe = recipes.find(r => r.id === t.recipeId);
      return { recipeName: recipe?.name || '', quantity: t.quantity };
    }),
    results,
  };

  addHistory(historyRecord);

  return { results, expandedResults };
}

/**
 * 导出CSV格式
 */
export function exportToCSV(results: { materialName: string; totalQuantity: number; unit: string }[]): string {
  const header = '原材料,数量,单位\n';
  const rows = results.map(r => `${r.materialName},${r.totalQuantity},${r.unit}`).join('\n');
  return header + rows;
}

/**
 * 下载CSV文件
 */
export function downloadCSV(results: { materialName: string; totalQuantity: number; unit: string }[]): void {
  const csv = exportToCSV(results);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `原材料清单_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 快速添加物品（如果不存在）
 */
export function quickAddMaterial(name: string, unit: string = '个', isRawMaterial: boolean = false): Material {
  const materials = getMaterials();
  let material = materials.find(m => m.name === name);
  
  if (!material) {
    material = {
      id: generateId(),
      name: name.trim(),
      unit,
      isRawMaterial,
      createdAt: Date.now(),
    };
    addMaterial(material);
  }
  
  return material;
}
