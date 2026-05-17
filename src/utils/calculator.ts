import { Recipe, Material, MaterialRequirement, RecipeConfig, CalculationHistory } from '../types';
import { getRecipes, getMaterials, addHistory, generateId } from './storage';

// 目标材料配置
export interface TargetConfig {
  recipeId: string;
  quantity: number;
}

// 展开后的原材料需求（带层级信息）
export interface ExpandedRequirement {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  // 配方链/加工步骤
  steps: { recipeName: string; quantity: number }[];
}

/**
 * 递归计算配方所需的最终原材料
 * 支持多层级：锯子需要铁板，铁板需要铁锭
 */
export function calculateExpandedRequirements(
  recipeId: string,
  targetQuantity: number,
  recipes: Recipe[],
  materials: Material[],
  currentSteps: { recipeName: string; quantity: number }[] = []
): ExpandedRequirement[] {
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return [];

  const multiplier = targetQuantity / recipe.outputQuantity;
  const newSteps = [...currentSteps, { recipeName: recipe.name, quantity: targetQuantity }];
  
  const requirements: Map<string, ExpandedRequirement> = new Map();

  for (const ingredient of recipe.ingredients) {
    const totalQty = ingredient.quantity * multiplier;
    const material = materials.find(m => m.id === ingredient.materialId);
    
    // 检查这个原材料是否也是一个配方的产出
    const subRecipe = recipes.find(r => r.name === material?.name);
    
    if (subRecipe) {
      // 递归计算子配方的原材料
      const subRequirements = calculateExpandedRequirements(
        subRecipe.id,
        totalQty,
        recipes,
        materials,
        newSteps
      );
      
      // 合并子需求
      for (const subReq of subRequirements) {
        if (requirements.has(subReq.materialId)) {
          const existing = requirements.get(subReq.materialId)!;
          existing.quantity += subReq.quantity;
        } else {
          requirements.set(subReq.materialId, { ...subReq });
        }
      }
    } else {
      // 这是最终原材料
      if (requirements.has(ingredient.materialId)) {
        const existing = requirements.get(ingredient.materialId)!;
        existing.quantity += totalQty;
      } else {
        requirements.set(ingredient.materialId, {
          materialId: ingredient.materialId,
          materialName: ingredient.materialName,
          quantity: totalQty,
          unit: material?.unit || '个',
          steps: newSteps,
        });
      }
    }
  }

  return Array.from(requirements.values()).sort((a, b) => 
    a.materialName.localeCompare(b.materialName)
  );
}

/**
 * 计算指定配方所需的直接原材料（不展开子配方）
 */
export function calculateRequirements(
  recipeId: string,
  targetQuantity: number,
  recipes: Recipe[],
  materials: Material[]
): MaterialRequirement[] {
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return [];

  const requirements: Map<string, MaterialRequirement> = new Map();
  const multiplier = targetQuantity / recipe.outputQuantity;

  for (const ingredient of recipe.ingredients) {
    const totalQty = ingredient.quantity * multiplier;
    const material = materials.find(m => m.id === ingredient.materialId);

    if (requirements.has(ingredient.materialId)) {
      const existing = requirements.get(ingredient.materialId)!;
      existing.totalQuantity += totalQty;
    } else {
      requirements.set(ingredient.materialId, {
        materialId: ingredient.materialId,
        materialName: ingredient.materialName,
        totalQuantity: totalQty,
        unit: material?.unit || '个',
      });
    }
  }

  return Array.from(requirements.values()).sort((a, b) => 
    a.materialName.localeCompare(b.materialName)
  );
}

/**
 * 检查配方中是否有子配方（用于标识二次加工）
 */
export function hasSubRecipes(recipeId: string, recipes: Recipe[], materials: Material[]): boolean {
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return false;

  for (const ingredient of recipe.ingredients) {
    const material = materials.find(m => m.id === ingredient.materialId);
    const subRecipe = recipes.find(r => r.name === material?.name);
    if (subRecipe) return true;
  }
  return false;
}

/**
 * 执行批量计算并保存历史记录
 * 格式: [目标材料1*数量]+[目标材料2*数量]+[时间]
 */
export function performCalculation(
  targets: TargetConfig[],
  expandSubRecipes: boolean = true
): { results: MaterialRequirement[]; expandedResults?: ExpandedRequirement[] } | null {
  if (targets.length === 0) return null;

  const recipes = getRecipes();
  const materials = getMaterials();
  const combinedRequirements: Map<string, MaterialRequirement> = new Map();
  const combinedExpanded: Map<string, ExpandedRequirement> = new Map();
  const targetSummaries: string[] = [];

  for (const target of targets) {
    const recipe = recipes.find(r => r.id === target.recipeId);
    if (!recipe) continue;

    targetSummaries.push(`${recipe.name}×${target.quantity}`);

    if (expandSubRecipes) {
      // 展开所有子配方
      const expanded = calculateExpandedRequirements(target.recipeId, target.quantity, recipes, materials);
      
      for (const req of expanded) {
        if (combinedExpanded.has(req.materialId)) {
          const existing = combinedExpanded.get(req.materialId)!;
          existing.quantity += req.quantity;
          // 合并步骤（取第一条）
        } else {
          combinedExpanded.set(req.materialId, { 
            ...req,
            steps: req.steps.slice(0, -1) // 移除最后一步（目标材料本身）
          });
        }
      }
    } else {
      // 不展开
      const requirements = calculateRequirements(target.recipeId, target.quantity, recipes, materials);

      for (const req of requirements) {
        if (combinedRequirements.has(req.materialId)) {
          const existing = combinedRequirements.get(req.materialId)!;
          existing.totalQuantity += req.totalQuantity;
        } else {
          combinedRequirements.set(req.materialId, { ...req });
        }
      }
    }
  }

  if (targetSummaries.length === 0) return null;

  const results = expandSubRecipes
    ? Array.from(combinedExpanded.values()).map(r => ({
        materialId: r.materialId,
        materialName: r.materialName,
        totalQuantity: r.quantity,
        unit: r.unit,
      })).sort((a, b) => a.materialName.localeCompare(b.materialName))
    : Array.from(combinedRequirements.values()).sort((a, b) => 
        a.materialName.localeCompare(b.materialName)
      );

  const expandedResults = expandSubRecipes 
    ? Array.from(combinedExpanded.values()).sort((a, b) => a.materialName.localeCompare(b.materialName))
    : undefined;

  // 生成时间字符串
  const now = new Date();
  const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

  // 保存历史记录: [目标1*数量]+[目标2*数量]+[时间]
  const historyRecord: CalculationHistory = {
    id: generateId(),
    timestamp: Date.now(),
    summary: `${targetSummaries.join(']+[')}]+[${timeStr}]`,
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
