import { Recipe, Material, MaterialRequirement, TargetConfig, CalculationHistory, ExpandedRequirement } from '../types';
import { getRecipes, getMaterials, addHistory, generateId } from './storage';

/**
 * 向上取整到最近的整数
 */
function ceilToInt(value: number): number {
  return Math.ceil(value);
}

/**
 * 递归计算目标物品所需的原材料
 * @param targetItemId 目标物品ID
 * @param targetQty 需要的目标物品数量
 * @param recipes 所有配方
 * @param materials 所有物品
 * @param materialRequirements 累计的原材料需求（带合成次数）
 * @param fromTargets 来源目标列表（用于追踪）
 */
function calculateForItem(
  targetItemId: string,
  targetQty: number,
  recipes: Recipe[],
  materials: Material[],
  materialRequirements: Map<string, { quantity: number; craftCount: number; fromTargets: Set<string> }>,
  fromTargets: string[]
): void {
  const material = materials.find(m => m.id === targetItemId || m.name === targetItemId);
  
  // 如果是原材料（开启状态），直接计入
  if (material?.isRawMaterial) {
    const existing = materialRequirements.get(material.id);
    if (existing) {
      existing.quantity += targetQty;
      fromTargets.forEach(t => existing.fromTargets.add(t));
    } else {
      materialRequirements.set(material.id, {
        quantity: targetQty,
        craftCount: 0, // 原材料不需要合成
        fromTargets: new Set(fromTargets),
      });
    }
    return;
  }

  // 查找该物品的配方
  const recipe = recipes.find(r => r.name === material?.name || r.id === targetItemId);
  if (!recipe) {
    // 没有配方，将其作为原材料计入
    const targetName = material?.name || targetItemId;
    const existing = materialRequirements.get(targetItemId);
    if (existing) {
      existing.quantity += targetQty;
      fromTargets.forEach(t => existing.fromTargets.add(t));
    } else {
      materialRequirements.set(targetItemId, {
        quantity: targetQty,
        craftCount: 0,
        fromTargets: new Set(fromTargets),
      });
    }
    return;
  }

  // 计算需要多少次合成（向上取整）
  const craftCount = ceilToInt(targetQty / recipe.outputQuantity);
  const actualOutput = craftCount * recipe.outputQuantity;

  // 遍历配方中的每个原材料
  for (const ingredient of recipe.ingredients) {
    // 计算该原材料需要的总量
    // 如果这次合成产出了 actualOutput 个目标物品，需要 ingredient.quantity * craftCount 个该原材料
    const ingredientQtyNeeded = ingredient.quantity * craftCount;

    // 递归计算该原材料
    calculateForItem(
      ingredient.materialId,
      ingredientQtyNeeded,
      recipes,
      materials,
      materialRequirements,
      fromTargets
    );
  }
}

/**
 * 执行批量计算
 * @param targets 目标配置列表
 * @returns 计算结果
 */
export function performCalculation(
  targets: TargetConfig[]
): { results: MaterialRequirement[]; expandedResults: ExpandedRequirement[] } | null {
  if (targets.length === 0) return null;

  const recipes = getRecipes();
  const materials = getMaterials();
  
  // 累计的原材料需求
  const materialRequirements = new Map<string, { quantity: number; craftCount: number; fromTargets: Set<string> }>();

  for (const target of targets) {
    const recipe = recipes.find(r => r.id === target.recipeId);
    if (!recipe) continue;

    const targetQty = target.quantity;
    const targetName = recipe.name;

    // 查找该配方的产出物品的material
    const outputMaterial = materials.find(m => m.name === recipe.name);
    if (!outputMaterial) continue;

    // 计算需要多少次合成
    const craftCount = ceilToInt(targetQty / recipe.outputQuantity);

    // 遍历配方中的每个原材料
    for (const ingredient of recipe.ingredients) {
      const ingredientQtyNeeded = ingredient.quantity * craftCount;

      // 递归计算
      calculateForItem(
        ingredient.materialId,
        ingredientQtyNeeded,
        recipes,
        materials,
        materialRequirements,
        [targetName]
      );
    }
  }

  // 转换为结果数组
  const results: MaterialRequirement[] = [];
  const expandedResults: ExpandedRequirement[] = [];

  for (const [materialId, data] of materialRequirements) {
    const material = materials.find(m => m.id === materialId);
    const requirement: MaterialRequirement = {
      materialId,
      materialName: material?.name || materialId,
      totalQuantity: data.quantity,
      unit: material?.unit || '个',
    };
    results.push(requirement);

    expandedResults.push({
      ...requirement,
      craftCount: data.craftCount,
      fromTargets: Array.from(data.fromTargets),
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
 * 计算直接配方需求（不展开子配方）
 */
export function calculateDirectRequirements(
  targets: TargetConfig[]
): MaterialRequirement[] {
  if (targets.length === 0) return [];

  const recipes = getRecipes();
  const materials = getMaterials();
  const requirements = new Map<string, MaterialRequirement>();

  for (const target of targets) {
    const recipe = recipes.find(r => r.id === target.recipeId);
    if (!recipe) continue;

    const multiplier = target.quantity / recipe.outputQuantity;

    for (const ingredient of recipe.ingredients) {
      const totalQty = ingredient.quantity * multiplier;
      const material = materials.find(m => m.id === ingredient.materialId);

      if (requirements.has(ingredient.materialId)) {
        requirements.get(ingredient.materialId)!.totalQuantity += totalQty;
      } else {
        requirements.set(ingredient.materialId, {
          materialId: ingredient.materialId,
          materialName: ingredient.materialName,
          totalQuantity: totalQty,
          unit: material?.unit || '个',
        });
      }
    }
  }

  return Array.from(requirements.values()).sort((a, b) => 
    a.materialName.localeCompare(b.materialName)
  );
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
