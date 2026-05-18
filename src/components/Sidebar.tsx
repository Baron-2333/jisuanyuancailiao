/**
 * 侧边栏组件
 */
import { cn } from '../utils/utils';
import { tabs, TabType } from '../config/tabs';
import { VERSION } from '../utils/version';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-60 bg-[#0f0f1a] border-r border-[#1e1e2e] flex flex-col fixed h-screen z-20">
      {/* Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-[#1e1e2e]">
        <img src="/logo.png" alt="logo" className="w-10 h-10 rounded-lg object-cover" />
        <div className="flex flex-col">
          <h1 className="text-white font-bold text-base leading-tight">配方计算器</h1>
          <span className="text-[11px] text-slate-500">{VERSION}</span>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? "bg-[#4f46e5] text-white"
                : "text-slate-400 hover:text-white hover:bg-[#1e1e2e]"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </nav>

    </aside>
  );
}
