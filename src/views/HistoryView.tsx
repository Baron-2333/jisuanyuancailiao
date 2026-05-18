/**
 * 历史记录视图
 */
import { useState } from 'react';
import { Trash2, ChevronRight, Calculator, History } from 'lucide-react';
import { cn } from '../utils/utils';
import { deleteHistoryItem, clearHistory } from '../utils/storage';
import { CalculationHistory } from '../types';

interface HistoryViewProps {
  history: CalculationHistory[];
  onHistoryChange: () => void;
}

export function HistoryView({ history, onHistoryChange }: HistoryViewProps) {
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  const handleDeleteItem = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      deleteHistoryItem(id);
      onHistoryChange();
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      clearHistory();
      onHistoryChange();
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4 flex items-center justify-between bg-[#13131f] border border-[#1e1e2e]">
        <h2 className="text-lg font-semibold text-white">
          计算历史
          <span className="text-base font-normal ml-2 text-slate-400">
            {history.length} 条
          </span>
        </h2>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-base text-red-400 border border-red-400 hover:bg-[#1a1a2e]"
          >
            <Trash2 size={18} />
            清空
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl p-12 text-center bg-[#13131f] border border-[#1e1e2e]">
          <History className="mx-auto text-slate-600" size={48} />
          <p className="mt-4 text-lg text-slate-400">暂无历史记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(record => (
            <div
              key={record.id}
              className={cn(
                'rounded-xl cursor-pointer transition-all bg-[#13131f] border border-[#1e1e2e]',
                selectedRecord === record.id && "ring-2 ring-indigo-500"
              )}
              onClick={() => setSelectedRecord(selectedRecord === record.id ? null : record.id)}
            >
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-600/20">
                    <Calculator className="text-indigo-400" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-base text-white">
                      {record.summary}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(record.id); }}
                    className="p-2 rounded-lg text-red-400 hover:bg-[#1a1a2e]"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight
                    size={20}
                    className={cn(
                      'transition-transform text-slate-400',
                      selectedRecord === record.id ? "rotate-90" : ""
                    )}
                  />
                </div>
              </div>

              {selectedRecord === record.id && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-700">
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 px-2 font-medium text-slate-400">材料</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-400">数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {record.results.map(req => (
                        <tr key={req.materialId} className="border-b border-slate-700">
                          <td className="py-2 px-2 text-white">{req.materialName}</td>
                          <td className="py-2 px-2 text-right font-medium text-indigo-400">
                            {req.totalQuantity} {req.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
