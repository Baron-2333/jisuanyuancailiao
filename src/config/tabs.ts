/**
 * 应用配置 - 标签页配置
 */
import { Calculator, Package, BookOpen, Cog, History, Settings } from 'lucide-react';

export type TabType = 'calculator' | 'materials' | 'recipes' | 'processes' | 'history' | 'settings';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: typeof Calculator;
}

export const tabs: TabConfig[] = [
  { id: 'calculator', label: '配方计算', icon: Calculator },
  { id: 'materials', label: '物品管理', icon: Package },
  { id: 'recipes', label: '配方管理', icon: BookOpen },
  { id: 'processes', label: '加工程序', icon: Cog },
  { id: 'history', label: '历史记录', icon: History },
  { id: 'settings', label: '用户设置', icon: Settings },
];

export const pageDescriptions: Record<TabType, string> = {
  calculator: '选择配方，一键计算所需原材料',
  materials: '管理所有物品和原材料',
  recipes: '创建和管理合成配方',
  processes: '配置加工程序和追溯规则',
  history: '查看过去的计算记录',
  settings: '用户登录和偏好设置',
};
