// 原材料类型
export interface Material {
  id: string;
  name: string;
  unit: string; // 单位：如个、kg、吨
  isRawMaterial: boolean; // 是否作为原材料（开启后不拆解）
  createdAt: number;
}

// 配方中的原材料项
export interface RecipeIngredient {
  materialId: string;
  materialName: string;
  quantity: number; // 合成1次需要的数量
}

// 配方类型
export interface Recipe {
  id: string;
  name: string; // 目标材料名称
  outputQuantity: number; // 产出数量
  ingredients: RecipeIngredient[]; // 原材料
  createdAt: number;
  updatedAt: number;
}

// 计算历史记录
export interface CalculationHistory {
  id: string;
  timestamp: number;
  summary: string;
  targets: { recipeName: string; quantity: number }[];
  results: MaterialRequirement[];
}

// 计算结果
export interface MaterialRequirement {
  materialId: string;
  materialName: string;
  totalQuantity: number;
  unit: string;
}

// 目标配置
export interface TargetConfig {
  recipeId: string;
  quantity: number;
}

// 展开后的需求（带合成次数）
export interface ExpandedRequirement extends MaterialRequirement {
  craftCount: number; // 需要合成的次数
  fromTargets: string[]; // 来源：哪些目标物品需要它
}
