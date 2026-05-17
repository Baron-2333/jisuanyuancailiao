// 原材料类型
export interface Material {
  id: string;
  name: string;
  unit: string; // 单位：如个、kg、吨
  createdAt: number;
}

// 配方中的原材料项
export interface RecipeIngredient {
  materialId: string;
  materialName: string;
  quantity: number;
}

// 配方类型
export interface Recipe {
  id: string;
  name: string; // 目标材料名称
  outputQuantity: number; // 产出数量（通常为1）
  ingredients: RecipeIngredient[]; // 1-9种原材料
  createdAt: number;
  updatedAt: number;
}

// 计算历史记录（支持多目标）
export interface CalculationHistory {
  id: string;
  timestamp: number;
  // 格式: [目标材料1*数量]+[目标材料2*数量]+[时间]
  summary: string;
  targets: { recipeName: string; quantity: number }[];
  results: MaterialRequirement[];
}

// 计算结果（原材料需求）
export interface MaterialRequirement {
  materialId: string;
  materialName: string;
  totalQuantity: number;
  unit: string;
}

// 配方配置（用于计算）
export interface RecipeConfig {
  recipeId: string;
  targetQuantity: number;
}

// 加工步骤类型
export interface ProcessStepInput {
  name: string;      // 原材料名称
  quantity: number;  // 原材料数量
}

export interface ProcessStep {
  id: string;
  inputs: ProcessStepInput[];  // 多种原材料
  processName: string;          // 加工步骤名称
  outputs: ProcessStepInput[];   // 多种产物
  createdAt: number;
}

// 溯源配置类型
export interface TraceableMaterial {
  id: string;
  materialId: string;      // 材料ID
  materialName: string;     // 材料名称
  targetMaterialId: string; // 溯源目标材料ID
  targetMaterialName: string; // 溯源目标材料名称
  targetQuantity: number;   // 溯源目标材料数量（每1个当前材料需要多少目标材料）
}

// 应用状态
export interface AppState {
  materials: Material[];
  recipes: Recipe[];
  history: CalculationHistory[];
  processSteps: ProcessStep[];
}
