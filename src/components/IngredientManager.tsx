/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, Check, X, FileSpreadsheet, Sparkles } from 'lucide-react';
import { Ingredient, IngredientCategory } from '../types';

interface IngredientManagerProps {
  ingredients: Ingredient[];
  onAddIngredient: (newIng: Ingredient) => void;
  onUpdateIngredient: (updatedIng: Ingredient) => void;
  onDeleteIngredient: (id: string) => void;
}

export default function IngredientManager({
  ingredients,
  onAddIngredient,
  onUpdateIngredient,
  onDeleteIngredient,
}: IngredientManagerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | 'all'>('all');
  
  // State for creating new ingredient
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<IngredientCategory>('tinh_bot');
  const [newWaste, setNewWaste] = useState(0);
  const [newEnergy, setNewEnergy] = useState(0);
  const [newProtein, setNewProtein] = useState(0);
  const [newLipid, setNewLipid] = useState(0);
  const [newCarb, setNewCarb] = useState(0);
  const [newCalcium, setNewCalcium] = useState(0);
  const [newIron, setNewIron] = useState(0);
  const [newPrice, setNewPrice] = useState(10000);

  // State for editing existing ingredient
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editWaste, setEditWaste] = useState(0);

  const categories: { value: IngredientCategory; label: string }[] = [
    { value: 'tinh_bot', label: 'Tinh bột / Lương thực' },
    { value: 'thit_thuy_san', label: 'Thịt & Thủy hải sản' },
    { value: 'sua_trung', label: 'Trứng & Sữa' },
    { value: 'chat_beo', label: 'Chất béo (Dầu, mỡ)' },
    { value: 'rau_cu_qua', label: 'Rau củ quả sạch' },
    { value: 'trai_cay', label: 'Trái cây' },
    { value: 'gia_vi_khac', label: 'Gia vị & Khác' },
  ];

  const getCategoryLabel = (cat: IngredientCategory) => {
    switch (cat) {
      case 'tinh_bot': return 'Tinh bột';
      case 'thit_thuy_san': return 'Thịt / Thủy sản';
      case 'sua_trung': return 'Sữa / Trứng';
      case 'chat_beo': return 'Chất béo';
      case 'rau_cu_qua': return 'Rau củ quả';
      case 'trai_cay': return 'Trái cây';
      case 'gia_vi_khac': return 'Gia vị';
      default: return 'Khác';
    }
  };

  const filtered = useMemo(() => {
    return ingredients.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [ingredients, search, selectedCategory]);

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newIng: Ingredient = {
      id: `custom_${Date.now()}`,
      name: newName,
      category: newCat,
      wasteRate: newWaste,
      energy: newEnergy,
      protein: newProtein,
      lipid: newLipid,
      carbohydrate: newCarb,
      calcium: newCalcium,
      iron: newIron,
      price: newPrice,
      isCustom: true,
    };

    onAddIngredient(newIng);
    
    // Reset form
    setNewName('');
    setNewWaste(0);
    setNewEnergy(0);
    setNewProtein(0);
    setNewLipid(0);
    setNewCarb(0);
    setNewCalcium(0);
    setNewIron(0);
    setNewPrice(10000);
    setIsAdding(false);
  };

  const startEdit = (item: Ingredient) => {
    setEditingId(item.id);
    setEditPrice(item.price);
    setEditWaste(item.wasteRate);
  };

  const saveEdit = (item: Ingredient) => {
    onUpdateIngredient({
      ...item,
      price: editPrice,
      wasteRate: editWaste,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Action panel & Search */}
      <div className="bg-white rounded-2xl border border-natural-border p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-natural-dark">Cơ sở dữ liệu Thực phẩm</h2>
            <p className="text-xs text-natural-muted">
              Quản lý {ingredients.length} loại nguyên liệu. Bạn có thể thay đổi đơn giá học đường, tỉ lệ thải bỏ hoặc thêm nguyên liệu mới.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-4 py-2 bg-natural-primary hover:bg-natural-primary-hover text-white rounded-xl text-xs font-semibold cursor-pointer transition-all self-start sm:self-auto shadow-xs"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Hủy thêm thực phẩm' : 'Thêm thực phẩm mới'}
          </button>
        </div>

        {/* Add food form */}
        {isAdding && (
          <form onSubmit={handleSaveNew} className="bg-natural-light/30 p-5 rounded-2xl border border-natural-border space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 pb-2 border-b border-natural-border">
              <Sparkles className="w-4 h-4 text-natural-primary" />
              <h3 className="text-xs font-bold text-natural-dark uppercase tracking-wider">Thêm thực phẩm tùy chỉnh</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-natural-text">Tên thực phẩm</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cá chép phi lê..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-natural-border rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-natural-primary text-natural-dark font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-natural-text">Nhóm thực phẩm</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as IngredientCategory)}
                  className="w-full px-3 py-1.5 border border-natural-border rounded-xl text-xs bg-white focus:outline-none text-natural-dark font-medium"
                >
                  {categories.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-natural-text">Tỉ lệ thải bỏ (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newWaste}
                  onChange={(e) => setNewWaste(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-1.5 border border-natural-border rounded-xl text-xs bg-white focus:outline-none text-natural-dark font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-natural-muted uppercase">Năng lượng (kcal)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newEnergy}
                  onChange={(e) => setNewEnergy(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-natural-border rounded-xl text-xs text-center focus:outline-none text-natural-dark font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-natural-muted uppercase">Đạm (Protein - g)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newProtein}
                  onChange={(e) => setNewProtein(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-natural-border rounded-xl text-xs text-center focus:outline-none text-natural-dark font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-natural-muted uppercase">Béo (Lipid - g)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newLipid}
                  onChange={(e) => setNewLipid(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-natural-border rounded-xl text-xs text-center focus:outline-none text-natural-dark font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-natural-muted uppercase">Đường (Carb - g)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newCarb}
                  onChange={(e) => setNewCarb(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-natural-border rounded-xl text-xs text-center focus:outline-none text-natural-dark font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-natural-muted uppercase">Canxi (Ca - mg)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newCalcium}
                  onChange={(e) => setNewCalcium(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-natural-border rounded-xl text-xs text-center focus:outline-none text-natural-dark font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-natural-muted uppercase">Sắt (Fe - mg)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={newIron}
                  onChange={(e) => setNewIron(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-2 py-1.5 border border-natural-border rounded-xl text-xs text-center focus:outline-none text-natural-dark font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-natural-text whitespace-nowrap">Đơn giá học đường (VNĐ/kg):</span>
                <input
                  type="number"
                  min="1"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-full sm:w-40 px-3 py-1.5 border border-natural-border rounded-xl text-xs font-bold text-natural-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-1.5 text-natural-muted hover:bg-natural-light rounded-lg text-xs font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-natural-primary hover:bg-natural-primary-hover text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Lưu thực phẩm
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filters and Searches */}
        <div className="flex flex-col md:flex-row gap-3 pt-2">
          <div className="relative flex-grow">
            <Search className="w-4 h-4 text-natural-muted/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nhanh thực phẩm trong kho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-natural-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-natural-primary text-natural-dark font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-natural-primary border-natural-primary text-white'
                  : 'bg-natural-light border-natural-border text-natural-text hover:bg-natural-hover'
              }`}
            >
              Tất cả ({ingredients.length})
            </button>
            {categories.map((c) => {
              const count = ingredients.filter(i => i.category === c.value).length;
              return (
                <button
                  key={c.value}
                  onClick={() => setSelectedCategory(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === c.value
                      ? 'bg-natural-primary border-natural-primary text-white'
                      : 'bg-natural-light border-natural-border text-natural-text hover:bg-natural-hover'
                  }`}
                >
                  {getCategoryLabel(c.value)} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-white rounded-2xl border border-natural-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-natural-light text-natural-muted text-[10px] font-bold uppercase tracking-wider border-b border-natural-border">
                <th className="px-6 py-3.5">Tên thực phẩm</th>
                <th className="px-4 py-3.5">Nhóm</th>
                <th className="px-4 py-3.5 text-center">Thải bỏ (%)</th>
                <th className="px-4 py-3.5 text-center">Kcal/100g</th>
                <th className="px-4 py-3.5 text-center">Đạm (g)</th>
                <th className="px-4 py-3.5 text-center">Béo (g)</th>
                <th className="px-4 py-3.5 text-center">Đường (g)</th>
                <th className="px-4 py-3.5 text-center">Canxi (mg)</th>
                <th className="px-4 py-3.5 text-center">Sắt (mg)</th>
                <th className="px-4 py-3.5 text-right">Đơn giá / kg</th>
                <th className="px-6 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-natural-border/50 text-xs font-semibold text-natural-text">
              {filtered.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-natural-light/40 transition-colors">
                    {/* Name */}
                    <td className="px-6 py-3.5 font-extrabold text-natural-dark">
                      <div className="flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.isCustom && (
                          <span className="px-1.5 py-0.2 bg-natural-primary/10 text-natural-primary text-[9px] rounded-full font-bold uppercase border border-natural-primary/20">
                            Tùy chọn
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 text-natural-muted font-semibold">
                      {getCategoryLabel(item.category)}
                    </td>

                    {/* Waste Rate */}
                    <td className="px-4 py-3.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editWaste}
                          onChange={(e) => setEditWaste(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className="w-12 px-1 py-0.5 border border-natural-border rounded text-center font-bold text-natural-dark bg-white"
                        />
                      ) : (
                        <span className="text-natural-dark font-extrabold">{item.wasteRate}%</span>
                      )}
                    </td>

                    {/* Energy */}
                    <td className="px-4 py-3.5 text-center text-natural-text font-semibold">{item.energy}</td>

                    {/* Nutrients */}
                    <td className="px-4 py-3.5 text-center text-natural-text font-semibold">{item.protein}</td>
                    <td className="px-4 py-3.5 text-center text-natural-text font-semibold">{item.lipid}</td>
                    <td className="px-4 py-3.5 text-center text-natural-text font-semibold">{item.carbohydrate}</td>
                    <td className="px-4 py-3.5 text-center text-natural-text font-semibold">{item.calcium}</td>
                    <td className="px-4 py-3.5 text-center text-natural-text font-semibold">{item.iron}</td>

                    {/* Price */}
                    <td className="px-4 py-3.5 text-right font-extrabold text-natural-primary">
                      {isEditing ? (
                        <input
                          type="number"
                          min="100"
                          value={editPrice}
                          onChange={(e) => setEditPrice(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 px-1 py-0.5 border border-natural-border rounded text-right font-bold text-natural-primary bg-white"
                        />
                      ) : (
                        <span>{(item.price).toLocaleString()}đ</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(item)}
                              className="p-1 text-natural-primary hover:bg-natural-hover rounded-md transition-colors"
                              title="Lưu chỉnh sửa"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-natural-muted hover:bg-natural-hover rounded-md transition-colors"
                              title="Hủy bỏ"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1 text-natural-muted hover:bg-natural-hover hover:text-natural-dark rounded-md transition-colors"
                              title="Sửa giá & thải bỏ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {item.isCustom && (
                              <button
                                onClick={() => {
                                  if (confirm(`Bạn chắc chắn muốn xóa thực phẩm ${item.name}?`)) {
                                    onDeleteIngredient(item.id);
                                  }
                                }}
                                className="p-1 text-natural-muted hover:bg-natural-accent-orange/15 hover:text-natural-accent-orange rounded-md transition-colors"
                                title="Xóa thực phẩm"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filtered.length === 0 && (
          <div className="text-center py-12 text-natural-muted font-medium">
            Không có thực phẩm nào khớp với bộ lọc tìm kiếm
          </div>
        )}

        <div className="px-6 py-4 border-t border-natural-border bg-natural-light/30 flex justify-between items-center text-xs text-natural-muted font-semibold">
          <span>Đang hiển thị {filtered.length} thực phẩm</span>
          <span>Tổng số {ingredients.length} thực phẩm trong hệ thống</span>
        </div>
      </div>
    </div>
  );
}
