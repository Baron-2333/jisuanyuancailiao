import { Recipe, Material, MaterialRequirement, TargetConfig, CalculationHistory, ExpandedRequirement, UsageDetail, Process } from '../types';
import { getRecipes, getMaterials, getProcesses, addHistory, generateId, addMaterial } from './storage';

/**
 * 向上取整到最近的整数
 */
function ceilToInt(value: number): number {
  return Math.ceil(value);
}

// 产物链节点
interface ChainNode {
  name: string;       // 产物名称
  qty: number;        // 数量
}

// 合成链记录（完整路径）
interface CraftChain {
  material: string;      // 原材料名称（最底层）
  materialQty: number;   // 需要多少原材料
  path: ChainNode[];     // 完整产物链：[{name, qty}, ...]
  final: string;        // 最终产物名称
  finalQty: number;     // 最终产物数量
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
 */
function calculateForItem(
  targetItemName: string,
  targetQty: number,
  finalItem: string,
  finalQty: number,
  recipes: Recipe[],
  materials: Material[],
  processes: Process[],
  materialRequirements: Map<string, UsageRecord>,
  intermediateItem: string = '',
  intermediateQty: number = 0,
  currentPath: ChainNode[] = []
): void {
  // 查找该物品是否是原材料（开启状态）
  const material = materials.find(m => m.name === targetItemName);
  
  if (material?.isRawMaterial) {
    // 如果是原材料，直接计入并记录完整的合成链
    const chain: CraftChain = {
      material: targetItemName,
      materialQty: targetQty,
      path: [...currentPath, { name: targetItemName, qty: targetQty }],
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
  
  // 添加当前产物到路径
  const newPath = [...currentPath, { name: targetItemName, qty: targetQty }];
  
  if (!recipe) {
    // 没有配方，检查是否有开启追溯的加工程序
    const traceProcess = processes.find(p => p.outputName === targetItemName && p.traceEnabled);
    
    if (traceProcess) {
      // 有追溯：直接计算追溯的原材料
      const inputQtyNeeded = ceilToInt(targetQty * traceProcess.inputQuantity / traceProcess.outputQuantity);
      calculateForItem(
        traceProcess.inputName,
        inputQtyNeeded,
        finalItem,
        finalQty,
        recipes,
        materials,
        processes,
        materialRequirements,
        targetItemName,
        targetQty,
        [...newPath, { name: `${traceProcess.name}→${targetItemName}`, qty: targetQty }]
      );
      return;
    }
    
    // 没有配方也没有追溯，作为不可拆解物品计入
    const chain: CraftChain = {
      material: targetItemName,
      materialQty: targetQty,
      path: newPath,
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

  // 计算需要多少次合成
  const craftCount = ceilToInt(targetQty / recipe.outputQuantity);
  const actualOutput = craftCount * recipe.outputQuantity;

  // 遍历配方中的每个原材料
  for (const ingredient of recipe.ingredients) {
    const ingredientQtyNeeded = ingredient.quantity * craftCount;

    // 递归计算该原材料
    calculateForItem(
      ingredient.materialName,
      ingredientQtyNeeded,
      finalItem,
      finalQty,
      recipes,
      materials,
      processes,
      materialRequirements,
      targetItemName,
      actualOutput,
      newPath
    );
  }
}

/**
 * 格式化产物链为展示文本
 * 格式：X个原材料 → 做成X个中间产物1 → 做成X个中间产物2
 */
function formatChainPath(path: ChainNode[]): string {
  if (path.length < 2) return '';
  
  // path 是从中间产物到原材料的方向记录的，需要反转
  // 原始 path: [{木板,60}, {原木,15}]
  // 反转后:   [{原木,15}, {木板,60}]
  // 显示:     15个原木 → 做成60个木板
  
  const reversedPath = [...path].reverse();
  
  let text = `${reversedPath[0].qty}个${reversedPath[0].name}`;
  
  for (let i = 1; i < reversedPath.length; i++) {
    text += ` → 做成${reversedPath[i].qty}个${reversedPath[i].name}`;
  }
  
  return text;
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
  const processes = getProcesses();
  
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
        processes,
        materialRequirements,
        '',  // intermediateItem
        0,   // intermediateQty
        []   // currentPath
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

    // 生成用途详情（带完整产物链）
    const usageDetails: UsageDetail[] = [];
    
    // 按最终产物分组
    const finalMap = new Map<string, { chains: CraftChain[] }>();
    
    for (const chain of data.craftChain) {
      const key = `${chain.final}×${chain.finalQty}`;
      if (finalMap.has(key)) {
        finalMap.get(key)!.chains.push(chain);
      } else {
        finalMap.set(key, { chains: [chain] });
      }
    }
    
    for (const [key, info] of finalMap) {
      const [finalItem, finalQtyStr] = key.split('×');
      const finalQty = parseInt(finalQtyStr);
      
      // 合并相同路径的链
      const pathMap = new Map<string, { totalQty: number; chain: CraftChain }>();
      
      for (const chain of info.chains) {
        const pathKey = chain.path.map(p => `${p.name}×${p.qty}`).join('|');
        if (pathMap.has(pathKey)) {
          pathMap.get(pathKey)!.totalQty += chain.materialQty;
        } else {
          pathMap.set(pathKey, { totalQty: chain.materialQty, chain });
        }
      }
      
      for (const [, info] of pathMap) {
        const { totalQty, chain } = info;
        const chainText = formatChainPath(chain.path);
        
        usageDetails.push({
          forItem: finalItem,
          forQty: finalQty,
          qty: totalQty,
          craftCount: 1,
          intermediate: chain.path.length > 1 ? chain.path[chain.path.length - 1].name : finalItem,
          intermediateQty: chain.path.length > 1 ? chain.path[chain.path.length - 1].qty : finalQty,
          chainPath: chain.path,
          chainText: chainText,
        });
      }
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
