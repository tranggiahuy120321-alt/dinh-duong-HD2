/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, X, Eye } from 'lucide-react';
import { Ingredient, IngredientCategory } from '../types';

interface IngredientSelectorProps {
  ingredients: Ingredient[];
  onSelect: (ingredient: Ingredient, initialQuantity: number) => void;
  onClose: () => void;
}

export default function IngredientSelector({ ingredients, onSelect, onClose }: IngredientSelectorProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | 'all'>('all');
  const [initialQty, setInitialQty] = useState<number>(10);

  const categories: { value: IngredientCategory | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'Tất cả nhóm', color: 'bg-natural-light text-natural-text' },
    { value: 'tinh_bot', label: 'Lương thực / Tinh bột', color: 'bg-natural-light text-natural-dark border-natural-border' },
    { value: 'thit_thuy_san', label: 'Thịt & Thủy hải sản', color: 'bg-natural-primary/10 text-natural-primary border-natural-primary/20' },
    { value: 'sua_trung', label: 'Trứng & Sữa học đường', color: 'bg-natural-primary/10 text-natural-primary border-natural-primary/20' },
    { value: 'chat_beo', label: 'Chất béo (Dầu, mỡ)', color: 'bg-natural-accent-orange/10 text-natural-accent-orange border-natural-accent-orange/20' },
    { value: 'rau_cu_qua', label: 'Rau củ quả sạch', color: 'bg-natural-accent-green/10 text-natural-primary border-natural-accent-green/20' },
    { value: 'trai_cay', label: 'Trái cây tráng miệng', color: 'bg-natural-accent-orange/10 text-natural-accent-orange border-natural-accent-orange/20' },
    { value: 'gia_vi_khac', label: 'Gia vị & Khác', color: 'bg-natural-light text-natural-muted border-natural-border' },
  ];

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [ingredients, search, selectedCategory]);

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

  const getCategoryBadgeClass = (cat: IngredientCategory) => {
    switch (cat) {
      case 'tinh_bot': return 'bg-natural-light text-natural-dark border-natural-border';
      case 'thit_thuy_san': return 'bg-natural-primary/10 text-natural-primary border-natural-primary/20';
      case 'sua_trung': return 'bg-natural-primary/15 text-natural-primary border-natural-primary/25';
      case 'chat_beo': return 'bg-natural-accent-orange/10 text-natural-accent-orange border-natural-accent-orange/20';
      case 'rau_cu_qua': return 'bg-natural-accent-green/10 text-natural-primary border-natural-accent-green/20';
      case 'trai_cay': return 'bg-natural-accent-orange/10 text-natural-accent-orange border-natural-accent-orange/20';
      case 'gia_vi_khac': return 'bg-natural-light text-natural-muted border-natural-border';
      default: return 'bg-natural-light text-natural-text';
    }
  };

  return (
    <div className="fixed inset-0 bg-natural-dark/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-natural-border">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-natural-border bg-natural-panel">
          <div>
            <h3 className="text-base font-bold text-natural-dark">Chọn Thực phẩm dinh dưỡng</h3>
            <p className="text-xs text-natural-muted">Tra cứu trong danh mục hơn 100 loại thực phẩm mầm non cơ bản</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-natural-muted hover:bg-natural-light hover:text-natural-dark transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-6 border-b border-natural-border bg-white space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="w-4 h-4 text-natural-muted/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nhập tên thực phẩm cần tìm (ví dụ: Thịt lợn, rau ngót, sữa...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-natural-border rounded-xl text-xs bg-white text-natural-dark font-medium focus:outline-none focus:ring-2 focus:ring-natural-primary/20 focus:border-natural-primary placeholder-natural-muted/50 transition-colors"
                autoFocus
              />
            </div>
            
            <div className="flex items-center gap-2 bg-natural-light/40 px-3 py-1.5 rounded-xl border border-natural-border">
              <span className="text-xs font-semibold text-natural-text whitespace-nowrap">Số lượng thô đề xuất:</span>
              <input
                type="number"
                min="1"
                max="1000"
                value={initialQty}
                onChange={(e) => setInitialQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-16 px-1.5 py-0.5 text-center bg-white border border-natural-border rounded-lg text-xs font-bold text-natural-dark focus:outline-none"
              />
              <span className="text-xs font-semibold text-natural-muted">g/trẻ</span>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.value
                    ? 'bg-natural-primary border-natural-primary text-white shadow-xs'
                    : 'bg-white border-natural-border text-natural-text hover:border-natural-primary/50 hover:bg-natural-light'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results list */}
        <div className="flex-grow p-6 overflow-y-auto bg-natural-light/20">
          {filteredIngredients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-natural-muted font-bold mb-1">Không tìm thấy thực phẩm nào khớp với tìm kiếm</p>
              <p className="text-xs text-natural-muted/70">Hãy thử gõ từ khóa khác hoặc chuyển nhóm thực phẩm</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredIngredients.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-natural-border p-3.5 hover:shadow-xs hover:border-natural-primary transition-all flex justify-between items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-natural-dark text-sm">{item.name}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${getCategoryBadgeClass(item.category)}`}>
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                    
                    {/* Nutrient mini grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1 text-[10px] text-natural-muted font-bold">
                      <span>⚡ {item.energy} kcal</span>
                      <span>🥩 Đ: {item.protein}g</span>
                      <span>🥑 B: {item.lipid}g</span>
                      <span>🍚 ĐB: {item.carbohydrate}g</span>
                      <span>🥛 Ca: {item.calcium}mg</span>
                      <span>🧱 Fe: {item.iron}mg</span>
                    </div>

                    <div className="flex gap-4 text-[10px] text-natural-muted/60 mt-1 font-bold">
                      <span>🍂 Thải bỏ: <b className="text-natural-dark">{item.wasteRate}%</b></span>
                      <span>💰 Giá thô: <b className="text-natural-primary">{(item.price).toLocaleString()}đ/kg</b></span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelect(item, initialQty)}
                    className="ml-3 p-2 bg-natural-light hover:bg-natural-primary text-natural-primary hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center border border-natural-border"
                    title="Thêm vào thực đơn"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-natural-border bg-natural-panel flex items-center justify-between">
          <span className="text-xs text-natural-muted font-semibold">
            Hiển thị <b>{filteredIngredients.length}</b> thực phẩm trên tổng số <b>{ingredients.length}</b> loại
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-natural-text hover:bg-natural-light rounded-xl text-xs font-bold cursor-pointer border border-natural-border transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
