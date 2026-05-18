/**
 * 加工程序视图
 */
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Cog } from 'lucide-react';
import { cn } from '../utils/utils';
import { addProcess, updateProcess, deleteProcess, generateId } from '../utils/storage';
import { Process } from '../types';

interface ProcessesViewProps {
  processes: Process[];
  onProcessesChange: () => void;
  isReadOnly?: boolean;
}

export function ProcessesView({ processes, onProcessesChange, isReadOnly }: ProcessesViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    inputName: '',
    inputQuantity: 1,
    processStep: '',
    outputName: '',
    outputQuantity: 1,
    traceEnabled: true,
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProcesses = processes.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.inputName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.outputName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.inputName.trim() || !formData.outputName.trim()) return;

    if (editingId) {
      updateProcess(editingId, formData);
      setEditingId(null);
    } else {
      const newProcess: Process = {
        id: generateId(),
        ...formData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addProcess(newProcess);
    }

    setFormData({
      name: '',
      inputName: '',
      inputQuantity: 1,
      processStep: '',
      outputName: '',
      outputQuantity: 1,
      traceEnabled: true,
    });
    setShowForm(false);
    onProcessesChange();
  };

  const handleEdit = (process: Process) => {
    setFormData({
      name: process.name,
      inputName: process.inputName,
      inputQuantity: process.inputQuantity,
      processStep: process.processStep,
      outputName: process.outputName,
      outputQuantity: process.outputQuantity,
      traceEnabled: process.traceEnabled,
    });
    setEditingId(process.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个加工程序吗？')) {
      deleteProcess(id);
      onProcessesChange();
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      inputName: '',
      inputQuantity: 1,
      processStep: '',
      outputName: '',
      outputQuantity: 1,
      traceEnabled: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const toggleTrace = (process: Process) => {
    updateProcess(process.id, { traceEnabled: !process.traceEnabled });
    onProcessesChange();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4 bg-[#13131f] border border-[#1e1e2e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="搜索..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="px-4 py-2.5 rounded-lg text-base bg-[#1a1a2e]/80 text-white border-[#2a2a3e] placeholder-slate-400"
            />
            <span className="text-base text-slate-400">
              {filteredProcesses.length} 个
            </span>
          </div>
          <button
            onClick={() => setShowForm(true)}
            disabled={isReadOnly}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-base",
              isReadOnly
                ? "bg-[#1e1e2e] text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-600"
            )}
          >
            <Plus size={18} />
            {isReadOnly ? '只读' : '添加'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl p-6 bg-[#13131f] border border-[#1e1e2e]">
          <h3 className="font-semibold mb-4 text-white">
            {editingId ? '编辑加工程序' : '添加新加工程序'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-slate-400">
                  产物名称
                </label>
                <input
                  type="text"
                  required
                  value={formData.outputName}
                  onChange={e => setFormData({ ...formData, outputName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                  placeholder="产物名称"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-400">
                  产物数量
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.outputQuantity}
                  onChange={e => setFormData({ ...formData, outputQuantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-slate-400">
                加工步骤
              </label>
              <input
                type="text"
                value={formData.processStep}
                onChange={e => setFormData({ ...formData, processStep: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                placeholder="如：高温处理"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-slate-400">
                  原材料名称
                </label>
                <input
                  type="text"
                  required
                  value={formData.inputName}
                  onChange={e => setFormData({ ...formData, inputName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                  placeholder="原材料名称"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-slate-400">
                  原材料数量
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.inputQuantity}
                  onChange={e => setFormData({ ...formData, inputQuantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-slate-400">
                名称
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                placeholder="如：高炉熔炼"
              />
            </div>

            {/* 追溯开关 */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a2e]/50">
              <span className="text-sm text-slate-300">
                追溯计算（计算原材料时追溯此工序）
              </span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, traceEnabled: !formData.traceEnabled })}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  formData.traceEnabled ? "bg-green-500" : "bg-[#2a2a3e]"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                  formData.traceEnabled ? "left-6" : "left-0.5"
                )} />
              </button>
              <span className="text-xs text-slate-400">
                {formData.traceEnabled ? '开启' : '关闭'}
              </span>
            </div>

            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white">
                <Save size={16} className="inline mr-1" />
                保存
              </button>
              <button type="button" onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm border border-[#2a2a3e] text-slate-300">
                <X size={16} className="inline mr-1" />
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-xl overflow-hidden bg-[#13131f] border border-[#1e1e2e]">
        {filteredProcesses.length === 0 ? (
          <div className="p-10 text-center">
            <Cog className="mx-auto text-slate-600" size={40} />
            <p className="mt-3 text-slate-400">
              {searchTerm ? '没有找到' : '暂无数据'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#1a1a2e]/50">
              <tr>
                <th className="text-left py-2.5 px-4 font-medium text-slate-400">名称</th>
                <th className="text-center py-2.5 px-4 font-medium text-slate-400">输入</th>
                <th className="text-left py-2.5 px-4 font-medium text-slate-400">加工步骤</th>
                <th className="text-center py-2.5 px-4 font-medium text-slate-400">产物</th>
                <th className="text-center py-2.5 px-4 font-medium text-slate-400">追溯</th>
                <th className="text-right py-2.5 px-4 font-medium text-slate-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcesses.map(process => (
                <tr key={process.id} className="border-t border-slate-700">
                  <td className="py-2.5 px-4 font-medium text-white">{process.name}</td>
                  <td className="py-2.5 px-4 text-center text-slate-400">
                    {process.inputName} ×{process.inputQuantity}
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-400">{process.processStep}</td>
                  <td className="py-2.5 px-4 text-center text-slate-400">
                    {process.outputName} ×{process.outputQuantity}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => toggleTrace(process)}
                      className={cn(
                        "relative w-10 h-5 rounded-full transition-colors inline-block",
                        process.traceEnabled ? "bg-green-500" : "bg-[#2a2a3e]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                        process.traceEnabled ? "left-5" : "left-0.5"
                      )} />
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {!isReadOnly && (
                      <>
                        <button onClick={() => handleEdit(process)} className="p-1.5 rounded text-indigo-400 hover:bg-[#1a1a2e]">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(process.id)} className="p-1.5 rounded text-red-400 hover:bg-[#1a1a2e]">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
