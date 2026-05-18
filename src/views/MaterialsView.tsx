/**
 * 物品管理视图
 */
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X, Package } from 'lucide-react';
import { cn } from '../utils/utils';
import { addMaterial, updateMaterial, deleteMaterial, generateId } from '../utils/storage';
import { Material } from '../types';

interface MaterialsViewProps {
  materials: Material[];
  onMaterialsChange: () => void;
  isReadOnly?: boolean;
}

export function MaterialsView({ materials, onMaterialsChange, isReadOnly }: MaterialsViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', unit: '个', isRawMaterial: false });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const trimmedName = formData.name.trim();
    const isDuplicate = materials.some(m =>
      m.name.trim().toLowerCase() === trimmedName.toLowerCase() && m.id !== editingId
    );
    if (isDuplicate) {
      alert(`物品"${trimmedName}"已存在！`);
      return;
    }

    if (editingId) {
      updateMaterial(editingId, { name: trimmedName, unit: formData.unit, isRawMaterial: formData.isRawMaterial });
      setEditingId(null);
    } else {
      const newMaterial: Material = {
        id: generateId(),
        name: trimmedName,
        unit: formData.unit,
        isRawMaterial: formData.isRawMaterial,
        createdAt: Date.now(),
      };
      addMaterial(newMaterial);
    }

    setFormData({ name: '', unit: '个', isRawMaterial: false });
    setShowForm(false);
    onMaterialsChange();
  };

  const handleEdit = (material: Material) => {
    setFormData({ name: material.name, unit: material.unit, isRawMaterial: material.isRawMaterial });
    setEditingId(material.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个物品吗？')) {
      deleteMaterial(id);
      onMaterialsChange();
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', unit: '个', isRawMaterial: false });
    setEditingId(null);
    setShowForm(false);
  };

  const toggleRawMaterial = (material: Material) => {
    updateMaterial(material.id, { isRawMaterial: !material.isRawMaterial });
    onMaterialsChange();
  };

  const cardClass = "rounded-xl backdrop-blur-xl bg-[#13131f] border border-[#1e1e2e]";

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
              {filteredMaterials.length} 个
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
            {editingId ? '编辑物品' : '添加新物品'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                  placeholder="物品名称"
                />
              </div>
              <div className="w-24">
                <input
                  type="text"
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-[#1a1a2e] text-white border-[#2a2a3e]"
                  placeholder="单位"
                />
              </div>
            </div>

            {/* 原材料开关 */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a1a2e]/50">
              <span className="text-sm text-slate-300">
                标记为原材料（计算时不拆解）
              </span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isRawMaterial: !formData.isRawMaterial })}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  formData.isRawMaterial ? "bg-green-500" : "bg-[#2a2a3e]"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                  formData.isRawMaterial ? "left-6" : "left-0.5"
                )} />
              </button>
              <span className="text-xs text-slate-400">
                {formData.isRawMaterial ? '开启' : '关闭'}
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
        {filteredMaterials.length === 0 ? (
          <div className="p-10 text-center">
            <Package className="mx-auto text-slate-600" size={40} />
            <p className="mt-3 text-slate-400">
              {searchTerm ? '没有找到' : '暂无数据'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[#1a1a2e]/50">
              <tr>
                <th className="text-left py-2.5 px-4 font-medium text-slate-400">名称</th>
                <th className="text-center py-2.5 px-4 font-medium text-slate-400">单位</th>
                <th className="text-center py-2.5 px-4 font-medium text-slate-400">原材料</th>
                <th className="text-right py-2.5 px-4 font-medium text-slate-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredMaterials.map(material => (
                <tr key={material.id} className="border-t border-slate-700">
                  <td className="py-2.5 px-4 font-medium text-white">{material.name}</td>
                  <td className="py-2.5 px-4 text-center text-slate-400">{material.unit}</td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => toggleRawMaterial(material)}
                      className={cn(
                        "relative w-10 h-5 rounded-full transition-colors inline-block",
                        material.isRawMaterial ? "bg-green-500" : "bg-[#2a2a3e]"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
                        material.isRawMaterial ? "left-5" : "left-0.5"
                      )} />
                    </button>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {!isReadOnly && (
                      <>
                        <button onClick={() => handleEdit(material)} className="p-1.5 rounded text-indigo-400 hover:bg-[#1a1a2e]">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(material.id)} className="p-1.5 rounded text-red-400 hover:bg-[#1a1a2e]">
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
