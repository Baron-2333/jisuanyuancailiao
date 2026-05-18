import { Recipe, Material, MaterialRequirement, TargetConfig, CalculationHistory, ExpandedRequirement, UsageDetail } from '../types';
import { getRecipes, getMaterials, addHistory, generateId, addMaterial } from './storage';

/**
 * 向上取整到最近的整数
 */
function ceilToInt(value: number): number {
  return Math.ceil(value);
}

// 合成链记录
interface CraftChain {
  material: string;      // 原材料名称
  materialQty: number;   // 需要多少原材料
  intermediate: string;  // 中间产物名称
  intermediateQty: number; // 中间产物数量
  final: string;         // 最终产物名称
  finalQty: number;      // 最终产物数量
}

// 用途记录类型
interface UsageRecord {
  quantity: number;
  craftCount: number;
  sources: Set<string>;
  usageDetails: UsageDetail[];
  craftChain: CraftChain[];
}

/**
 * 递归计算目标物品所需的原材料，追踪完整合成链
 * 
 * @param targetItemName 当前要合成的物品名称
 * @param targetQty 需要的目标物品数量
 * @param finalItem 最终目标物品名称（最顶层）
 * @param finalQty 最终目标物品数量
 * @param recipes 所有配方
 * @param materials 所有物品
 * @param materialRequirements 累计的原材料需求
 * @param intermediateItem 上一层中间产物名称
 * @param intermediateQty 上一层中间产物数量（实际产出）
 */
function calculateForItem(
  targetItemName: string,
  targetQty: number,
  finalItem: string,
  finalQty: number,
  recipes: Recipe[],
  materials: Material[],
  materialRequirements: Map<string, UsageRecord>,
  intermediateItem: string = '',
  intermediateQty: number = 0
): void {
  // 查找该物品是否是原材料（开启状态）
  const material = materials.find(m => m.name === targetItemName);
  
  if (material?.isRawMaterial) {
    // 如果是原材料，直接计入并记录完整的合成链
    const chain: CraftChain = {
      material: targetItemName,
      materialQty: targetQty,
      intermediate: intermediateItem || '-',
      intermediateQty: intermediateQty || targetQty,
      final: finalItem,
      finalQty: finalQty,
    };
    
    const existing = materialRequirements.get(targetItemName);
    if (existing) {
      existing.quantity += targetQty;
      existing.craftChain.push(chain);
      existing.sources.add(finalItem);
    } else {
      materialRequirements.set(targetItemName, {
        quantity: targetQty,
        craftCount: 0,
        sources: new Set([finalItem]),
        usageDetails: [],
        craftChain: [chain],
      });
    }
    return;
  }

  // 查找该物品的配方（通过配方名称匹配）
  const recipe = recipes.find(r => r.name === targetItemName);
  if (!recipe) {
    // 没有配方，将其作为不可拆解物品计入
    const chain: CraftChain = {
      material: targetItemName,
      materialQty: targetQty,
      intermediate: intermediateItem || '-',
      intermediateQty: intermediateQty || targetQty,
      final: finalItem,
      finalQty: finalQty,
    };
    
    const existing = materialRequirements.get(targetItemName);
    if (existing) {
      existing.quantity += targetQty;
      existing.craftChain.push(chain);
      existing.sources.add(finalItem);
    } else {
      materialRequirements.set(targetItemName, {
        quantity: targetQty,
        craftCount: 0,
        sources: new Set([finalItem]),
        usageDetails: [],
        craftChain: [chain],
      });
    }
    return;
  }

  // 计算需要多少次合成（向上取整到合成次数）
  const craftCount = ceilToInt(targetQty / recipe.outputQuantity);
  // 实际产出数量 = 合成次数 × 每次产出
  const actualOutput = craftCount * recipe.outputQuantity;

  // 遍历配方中的每个原材料
  for (const ingredient of recipe.ingredients) {
    const ingredientQtyNeeded = ingredient.quantity * craftCount;

    // 递归计算该原材料
    // 当前物品(targetItemName)作为下一层的中间产物
    // actualOutput是实际产出数量（包含溢出的部分）
    calculateForItem(
      ingredient.materialName,
      ingredientQtyNeeded,
      finalItem,
      finalQty,
      recipes,
      materials,
      materialRequirements,
      targetItemName,  // 当前物品作为中间产物
      actualOutput     // 当前物品的实际产出数量
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

      // 递归计算，传入目标物品作为最终产物
      calculateForItem(
        ingredient.materialName,
        ingredientQtyNeeded,
        targetName,
        targetQty,
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

    // 按（最终产物，中间产物）分组合成链，相同分组合并数量
    const chainMap = new Map<string, CraftChain>();
    for (const chain of data.craftChain) {
      // 使用"最终产物@中间产物"作为分组键
      const key = `${chain.final}×${chain.finalQty}@${chain.intermediate}×${chain.intermediateQty}`;
      if (chainMap.has(key)) {
        const existing = chainMap.get(key)!;
        existing.materialQty += chain.materialQty;
      } else {
        chainMap.set(key, { ...chain });
      }
    }

    // 生成用途详情（按最终产物合并）
    const finalMap = new Map<string, { 
      materialQty: number; 
      intermediate: string; 
      intermediateQty: number;
      finalQty: number;
    }>();
    
    for (const [key, chain] of chainMap) {
      const finalKey = `${chain.final}×${chain.finalQty}`;
      if (finalMap.has(finalKey)) {
        const existing = finalMap.get(finalKey)!;
        existing.materialQty += chain.materialQty;
        // 中间产物数量应该相同，不需要累加
      } else {
        finalMap.set(finalKey, {
          materialQty: chain.materialQty,
          intermediate: chain.intermediate,
          intermediateQty: chain.intermediateQty,
          finalQty: chain.finalQty,
        });
      }
    }

    const usageDetails: UsageDetail[] = [];
    for (const [key, info] of finalMap) {
      const [finalItem, finalQtyStr] = key.split('×');
      usageDetails.push({
        forItem: finalItem,
        forQty: parseInt(finalQtyStr),
        qty: info.materialQty,
        craftCount: 1,
        intermediate: info.intermediate === '-' ? finalItem : info.intermediate,
        intermediateQty: info.intermediate === '-' ? info.finalQty : info.intermediateQty,
      });
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
