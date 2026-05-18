/**
 * 页面头部组件
 */
import { TabType, pageDescriptions } from '../config/tabs';

interface PageHeaderProps {
  activeTab: TabType;
}

export function PageHeader({ activeTab }: PageHeaderProps) {
  const tabLabels: Record<TabType, string> = {
    calculator: '配方计算',
    materials: '物品管理',
    recipes: '配方管理',
    processes: '加工程序',
    history: '历史记录',
    settings: '用户设置',
  };

  return (
    <header className="sticky top-0 z-10 px-8 py-5 bg-[#0a0a12]/90 backdrop-blur border-b border-[#1e1e2e]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{tabLabels[activeTab]}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{pageDescriptions[activeTab]}</p>
        </div>
      </div>
    </header>
  );
}
