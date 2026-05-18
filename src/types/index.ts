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
  pinyin: string; // 名称首字母（自动计算）
  outputQuantity: number; // 产出数量
  ingredients: RecipeIngredient[]; // 原材料
  createdAt: number;
  updatedAt: number;
}

import { pinyin } from 'pinyin-pro';

// 计算拼音首字母（使用 pinyin-pro 库自动转换所有汉字）
export function getPinyin(name: string): string {
  // 移除空格，使用 pinyin-pro 获取拼音数组
  const cleanName = name.replace(/\s+/g, '');
  const pinyinArray = pinyin(cleanName, { pattern: 'first', toneType: 'none' });
  return pinyinArray || cleanName.toLowerCase();
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

// 用途详情
export interface UsageDetail {
  forItem: string;      // 最终产物名称
  forQty: number;       // 最终产物数量
  qty: number;          // 需要多少原材料
  craftCount: number;   // 合成次数
  intermediate: string; // 中间产物名称
  intermediateQty: number; // 中间产物数量
}

// 展开后的需求（带合成次数）
export interface ExpandedRequirement extends MaterialRequirement {
  craftCount: number; // 需要合成的次数
  fromTargets: string[]; // 来源：哪些目标物品需要它
  usageDetails: UsageDetail[]; // 详细用途
}

// 加工程序类型
export interface Process {
  id: string;
  name: string;              // 加工程序名称（如"熔炼"、"锻造"）
  inputName: string;         // 输入材料名称
  inputQuantity: number;     // 输入数量
  processStep: string;       // 加工步骤描述
  outputName: string;        // 产物名称
  outputQuantity: number;     // 产物数量
  traceEnabled: boolean;     // 是否追溯计算
  createdAt: number;
  updatedAt: number;
}
