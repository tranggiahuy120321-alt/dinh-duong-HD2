/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, Trash2, Calendar, Users, DollarSign, AlertTriangle, 
  Sparkles, CheckCircle2, Save, FolderOpen, ArrowRightLeft, 
  ChefHat, Coffee, Egg, Info, X, Cloud, RefreshCw
} from 'lucide-react';
import { Meal, Dish, MenuIngredient, Ingredient, AgeGroup, SavedMenu } from '../types';
import { calculateDailyRation, checkAgainstStandard } from '../utils/calculator';
import { NUTRITION_STANDARDS } from '../data/standards';
import { DEFAULT_WEEKLY_MENUS } from '../data/defaultWeeklyMenus';
import IngredientSelector from './IngredientSelector';
import { saveMenuToFirebase, deleteMenuFromFirebase, getMenusFromFirebase } from '../lib/firebase';

const RECOMMENDED_DAYS: { id: string; name: string }[] = [
  { id: 'menu_1789470312863', name: 'Thứ 2' },
  { id: 'menu_1789471345693', name: 'Thứ 3' },
  { id: 'menu_1789472193676', name: 'Thứ 4' },
  { id: 'menu_1789473102104', name: 'Thứ 5' },
  { id: 'menu_1789473662094', name: 'Thứ 6' },
  { id: 'menu_1789474421769', name: 'Thứ 7' },
];

interface MenuPlannerProps {
  ingredients: Ingredient[];
  activeMealState: {
    ageGroup: AgeGroup;
    setAgeGroup: (val: AgeGroup) => void;
    childrenCount: number;
    setChildrenCount: (val: number) => void;
    budgetPerChild: number;
    setBudgetPerChild: (val: number) => void;
    meals: Meal[];
    setMeals: (val: Meal[]) => void;
    date: string;
    setDate: (val: string) => void;
  };
}

export default function MenuPlanner({ ingredients, activeMealState }: MenuPlannerProps) {
  const {
    ageGroup, setAgeGroup,
    childrenCount, setChildrenCount,
    budgetPerChild, setBudgetPerChild,
    meals, setMeals,
    date, setDate
  } = activeMealState;

  // Bản đồ tra cứu thực phẩm
  const ingredientsDb = useMemo(() => {
    return ingredients.reduce((acc, cur) => {
      acc[cur.id] = cur;
      return acc;
    }, {} as Record<string, Ingredient>);
  }, [ingredients]);

  // Trạng thái modal tìm chọn thực phẩm
  const [selectorActive, setSelectorActive] = useState<{ mealId: string; dishId: string } | null>(null);

  // Trạng thái danh sách thực đơn đã lưu trữ
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
  const [saveName, setSaveName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);

  // Tải danh sách thực đơn đã lưu trong localStorage và đồng bộ từ Google Cloud Firestore lúc khởi động
  useEffect(() => {
    // 1. Nạp từ localStorage trước cho trải nghiệm nhanh
    const local = localStorage.getItem('HUONG_DUONG_SAVED_MENUS');
    if (local) {
      try {
        setSavedMenus(JSON.parse(local));
      } catch (err) {
        console.error("Lỗi parse dữ liệu thực đơn lưu trữ", err);
      }
    }

    // 2. Đồng bộ tải từ Google Cloud Firestore
    async function syncCloudMenus() {
      try {
        setCloudSyncing(true);
        const cloudMenus = await getMenusFromFirebase();
        if (cloudMenus && cloudMenus.length > 0) {
          setSavedMenus(cloudMenus);
          localStorage.setItem('HUONG_DUONG_SAVED_MENUS', JSON.stringify(cloudMenus));
          console.log("Đã tải thành công danh sách thực đơn từ Google Cloud Database.");
        }
      } catch (err) {
        console.error("Không thể kết nối tải thực đơn từ đám mây:", err);
      } finally {
        setCloudSyncing(false);
      }
    }
    syncCloudMenus();
  }, []);

  // 6 thực đơn đề cử chuẩn dinh dưỡng (Thứ 2 -> Thứ 7) lấy ưu tiên từ savedMenus/Firestore
  const recommendedMenus = useMemo(() => {
    return RECOMMENDED_DAYS.map(day => {
      return (
        savedMenus.find(m => m.id === day.id) ||
        savedMenus.find(m => m.name.trim().toLowerCase() === day.name.toLowerCase()) ||
        DEFAULT_WEEKLY_MENUS.find(m => m.id === day.id)
      );
    }).filter((m): m is SavedMenu => !!m);
  }, [savedMenus]);

  // Tính toán dữ liệu dinh dưỡng hiện tại
  const nutrition = useMemo(() => {
    return calculateDailyRation(meals, ingredientsDb, childrenCount, budgetPerChild);
  }, [meals, ingredientsDb, childrenCount, budgetPerChild]);

  // Đối chiếu với tiêu chuẩn
  const standard = NUTRITION_STANDARDS[ageGroup];
  const checks = useMemo(() => {
    return checkAgainstStandard(nutrition, standard);
  }, [nutrition, standard]);

  // Mở thực đơn đề cử hoặc thực đơn đã lưu
  const handleLoadSample = (sample: SavedMenu) => {
    setAgeGroup(sample.ageGroup || 'lop_ghep');
    setChildrenCount(sample.childrenCount || 57);
    setBudgetPerChild(sample.budgetPerChild || 35000);
    setMeals(JSON.parse(JSON.stringify(sample.meals))); // Deep copy
    setShowLoadModal(false);
  };

  // Lưu thực đơn hiện tại
  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    const newSaved: SavedMenu = {
      id: `menu_${Date.now()}`,
      name: saveName,
      ageGroup,
      childrenCount,
      budgetPerChild,
      meals: JSON.parse(JSON.stringify(meals)),
      updatedAt: new Date().toLocaleDateString('vi-VN'),
    };

    const updated = [newSaved, ...savedMenus];
    setSavedMenus(updated);
    localStorage.setItem('HUONG_DUONG_SAVED_MENUS', JSON.stringify(updated));
    setSaveName('');
    setShowSaveModal(false);

    // Đồng bộ lên Google Cloud Firestore
    try {
      await saveMenuToFirebase(newSaved);
    } catch (err) {
      console.error("Lỗi đồng bộ thực đơn lên đám mây:", err);
    }
  };

  // Xóa thực đơn đã lưu
  const handleDeleteSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa thực đơn lưu trữ này?')) {
      const updated = savedMenus.filter(m => m.id !== id);
      setSavedMenus(updated);
      localStorage.setItem('HUONG_DUONG_SAVED_MENUS', JSON.stringify(updated));

      // Đồng bộ xóa trên Google Cloud Firestore
      try {
        await deleteMenuFromFirebase(id);
      } catch (err) {
        console.error("Lỗi xóa thực đơn trên đám mây:", err);
      }
    }
  };

  // Tùy biến bữa ăn trong bộ xây dựng thực đơn
  const handleAddMeal = () => {
    const defaultMealsName = ['Bữa sáng chính (07:30)', 'Bữa trưa chính (10:30)', 'Bữa phụ xế chiều (14:30)', 'Bữa phụ phụ tối (17:00)'];
    const currentCount = meals.length;
    const name = defaultMealsName[currentCount] || `Bữa ăn bổ sung ${currentCount + 1}`;
    
    setMeals([...meals, {
      id: `meal_${Date.now()}`,
      name,
      dishes: []
    }]);
  };

  const handleRemoveMeal = (mealId: string) => {
    if (confirm('Bạn có chắc muốn xóa bữa ăn này cùng toàn bộ món ăn bên trong?')) {
      setMeals(meals.filter(m => m.id !== mealId));
    }
  };

  // Tùy biến món ăn trong bữa ăn
  const handleAddDish = (mealId: string) => {
    const updated = meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          dishes: [...m.dishes, {
            id: `dish_${Date.now()}`,
            name: 'Món ăn mới',
            ingredients: []
          }]
        };
      }
      return m;
    });
    setMeals(updated);
  };

  const handleRemoveDish = (mealId: string, dishId: string) => {
    const updated = meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          dishes: m.dishes.filter(d => d.id !== dishId)
        };
      }
      return m;
    });
    setMeals(updated);
  };

  const handleUpdateDishName = (mealId: string, dishId: string, name: string) => {
    const updated = meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          dishes: m.dishes.map(d => {
            if (d.id === dishId) {
              return { ...d, name };
            }
            return d;
          })
        };
      }
      return m;
    });
    setMeals(updated);
  };

  // Quản lý nguyên liệu trong món ăn
  const handleOpenSelector = (mealId: string, dishId: string) => {
    setSelectorActive({ mealId, dishId });
  };

  const handleSelectIngredient = (ingredient: Ingredient, initialQuantity: number) => {
    if (!selectorActive) return;
    const { mealId, dishId } = selectorActive;

    const updated = meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          dishes: m.dishes.map(d => {
            if (d.id === dishId) {
              // Kiểm tra xem đã có nguyên liệu này chưa
              if (d.ingredients.some(i => i.ingredientId === ingredient.id)) {
                alert('Thực phẩm này đã được thêm vào món ăn này rồi!');
                return d;
              }
              return {
                ...d,
                ingredients: [...d.ingredients, {
                  ingredientId: ingredient.id,
                  quantityPerChild: initialQuantity
                }]
              };
            }
            return d;
          })
        };
      }
      return m;
    });

    setMeals(updated);
    setSelectorActive(null);
  };

  const handleUpdateIngredientQty = (mealId: string, dishId: string, ingredientId: string, qty: number) => {
    const updated = meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          dishes: m.dishes.map(d => {
            if (d.id === dishId) {
              return {
                ...d,
                ingredients: d.ingredients.map(i => {
                  if (i.ingredientId === ingredientId) {
                    return { ...i, quantityPerChild: Math.max(0.1, qty) };
                  }
                  return i;
                })
              };
            }
            return d;
          })
        };
      }
      return m;
    });
    setMeals(updated);
  };

  const handleRemoveIngredient = (mealId: string, dishId: string, ingredientId: string) => {
    const updated = meals.map(m => {
      if (m.id === mealId) {
        return {
          ...m,
          dishes: m.dishes.map(d => {
            if (d.id === dishId) {
              return {
                ...d,
                ingredients: d.ingredients.filter(i => i.ingredientId !== ingredientId)
              };
            }
            return d;
          })
        };
      }
      return m;
    });
    setMeals(updated);
  };

  // Tính hao hụt và lượng tinh ăn được
  const getEdibleQty = (rawQty: number, wasteRate: number) => {
    return rawQty * (1 - wasteRate / 100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* CỘT TRÁI + GIỮA: KHU VỰC THIẾT KẾ BỮA ĂN (Menu Workspace) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Bộ nhập liệu thiết lập cơ bản */}
        <div className="bg-white rounded-2xl border border-natural-border p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-natural-border">
            <h3 className="text-sm font-bold text-natural-dark uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4 text-natural-primary" />
              <span>Thiết lập khẩu phần hàng ngày</span>
            </h3>
            
            {/* Quick prebuilts buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowLoadModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-natural-light border border-natural-border hover:bg-natural-hover text-natural-text rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Thực đơn mẫu / Đã lưu</span>
              </button>
              
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-natural-primary/10 border border-natural-primary/20 hover:bg-natural-primary/20 text-natural-primary rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu thực đơn này</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Chọn độ tuổi */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-muted">Độ tuổi học sinh</label>
              <select
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                className="w-full px-3 py-2 border border-natural-border rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-natural-primary font-medium text-natural-text"
              >
                <option value="nha_tre_12_36">Nhà trẻ (12 - 36 tháng)</option>
                <option value="mau_giao_3_6">Mẫu giáo (3 - 6 tuổi)</option>
                <option value="lop_ghep">Lớp ghép nhiều độ tuổi</option>
              </select>
            </div>

            {/* Số lượng trẻ */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-muted">Số lượng trẻ ăn (Sĩ số)</label>
              <div className="relative">
                <Users className="w-4 h-4 text-natural-muted/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={childrenCount === 0 ? "" : childrenCount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setChildrenCount(0);
                    } else {
                      setChildrenCount(parseInt(val) || 0);
                    }
                  }}
                  onBlur={() => {
                    if (childrenCount < 1) {
                      setChildrenCount(1);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-natural-border rounded-xl text-xs focus:outline-none font-bold text-natural-dark"
                />
              </div>
            </div>

            {/* Định mức tiền ăn */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-muted">Định mức tiền (VNĐ/trẻ)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-natural-muted/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={budgetPerChild === 0 ? "" : budgetPerChild}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setBudgetPerChild(0);
                    } else {
                      setBudgetPerChild(parseInt(val) || 0);
                    }
                  }}
                  onBlur={() => {
                    if (budgetPerChild < 1000) {
                      setBudgetPerChild(1000);
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-natural-border rounded-xl text-xs focus:outline-none font-bold text-natural-primary"
                />
              </div>
            </div>

            {/* Ngày lập */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-natural-muted">Ngày áp dụng</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-natural-border rounded-xl text-xs focus:outline-none text-natural-text font-medium"
              />
            </div>
          </div>
        </div>

        {/* Workspace: Thêm & Dựng món ăn */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-extrabold text-natural-dark uppercase tracking-wide flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-natural-primary" />
              <span>Xây dựng bữa ăn & Món ăn chi tiết</span>
            </h2>
            <button
              onClick={handleAddMeal}
              className="flex items-center gap-1 px-3 py-1.5 bg-natural-light hover:bg-natural-hover text-natural-primary text-xs font-semibold rounded-xl border border-natural-border transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm bữa ăn mới</span>
            </button>
          </div>

          {meals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-natural-border p-12 text-center space-y-4">
              <p className="text-sm text-natural-muted font-medium">Chưa có bữa ăn nào trong ngày</p>
              <button
                onClick={handleAddMeal}
                className="px-4 py-2 bg-natural-primary hover:bg-natural-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Tạo bữa ăn đầu tiên
              </button>
            </div>
          ) : (
            meals.map((meal) => (
              <div key={meal.id} className="bg-white rounded-2xl border border-natural-border shadow-sm overflow-hidden space-y-4 pb-4">
                {/* Meal Header */}
                <div className="bg-natural-light border-b border-natural-border px-6 py-3.5 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <Coffee className="w-4 h-4 text-natural-accent-orange" />
                    <input
                      type="text"
                      value={meal.name}
                      onChange={(e) => {
                        const updated = meals.map(m => m.id === meal.id ? { ...m, name: e.target.value } : m);
                        setMeals(updated);
                      }}
                      className="bg-transparent border-b border-transparent hover:border-natural-border focus:border-natural-primary focus:outline-none text-xs font-bold text-natural-dark py-0.5"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAddDish(meal.id)}
                      className="text-[10px] font-bold text-natural-primary hover:text-natural-primary-hover hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Thêm món ăn</span>
                    </button>
                    <button
                      onClick={() => handleRemoveMeal(meal.id)}
                      className="text-natural-muted hover:text-natural-primary cursor-pointer p-1 rounded hover:bg-natural-hover"
                      title="Xóa bữa ăn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dishes list */}
                <div className="px-6 space-y-4">
                  {meal.dishes.length === 0 ? (
                    <div className="py-6 border border-dashed border-natural-border rounded-xl text-center text-xs text-natural-muted font-medium">
                      Chưa có món ăn nào trong bữa này. Hãy nhấn{' '}
                      <button
                        onClick={() => handleAddDish(meal.id)}
                        className="text-natural-primary hover:underline font-bold"
                      >
                        Thêm món ăn
                      </button>
                    </div>
                  ) : (
                    meal.dishes.map((dish) => (
                      <div key={dish.id} className="border border-natural-border rounded-xl p-4 space-y-3 bg-natural-light/30">
                        {/* Dish title bar */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="w-1 h-3 bg-natural-accent-orange rounded-full"></span>
                            <input
                              type="text"
                              value={dish.name}
                              onChange={(e) => handleUpdateDishName(meal.id, dish.id, e.target.value)}
                              className="bg-transparent border-b border-transparent hover:border-natural-border focus:border-natural-primary focus:outline-none text-xs font-bold text-natural-dark py-0.5"
                              placeholder="Nhập tên món ăn..."
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleOpenSelector(meal.id, dish.id)}
                              className="text-[10px] font-bold text-natural-primary hover:text-natural-primary-hover hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Chọn thực phẩm</span>
                            </button>
                            <button
                              onClick={() => handleRemoveDish(meal.id, dish.id)}
                              className="text-natural-muted hover:text-natural-primary cursor-pointer p-0.5"
                              title="Xóa món ăn"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Ingredients Table for this dish */}
                        {dish.ingredients.length === 0 ? (
                          <div className="py-4 text-center text-natural-muted text-xs italic font-medium">
                            Chưa chọn nguyên liệu nào cho món này.{' '}
                            <button
                              onClick={() => handleOpenSelector(meal.id, dish.id)}
                              className="text-natural-primary hover:underline font-bold"
                            >
                              Chọn ngay
                            </button>
                          </div>
                        ) : (
                          <div className="overflow-hidden border border-natural-border rounded-lg bg-white">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-natural-light/80 text-natural-muted font-bold border-b border-natural-border text-[10px]">
                                  <th className="px-3 py-2">Thực phẩm</th>
                                  <th className="px-3 py-2 text-center w-24">Thô / trẻ (g)</th>
                                  <th className="px-3 py-2 text-center">Ăn tinh (g)</th>
                                  <th className="px-3 py-2 text-center">Toàn trường (kg)</th>
                                  <th className="px-3 py-2 text-right">Đơn giá</th>
                                  <th className="px-3 py-2 text-right">Tổng thành tiền</th>
                                  <th className="px-3 py-2 text-center"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-natural-border/50 font-semibold text-natural-text">
                                {dish.ingredients.map((item) => {
                                  const ing = ingredientsDb[item.ingredientId];
                                  if (!ing) return null;

                                  const edible = getEdibleQty(item.quantityPerChild, ing.wasteRate);
                                  const totalRawKg = (item.quantityPerChild * childrenCount) / 1000;
                                  const totalCost = totalRawKg * ing.price;

                                  return (
                                    <tr key={item.ingredientId} className="hover:bg-natural-light/40">
                                      {/* Name */}
                                      <td className="px-3 py-2.5 font-bold text-natural-dark">
                                        <div className="flex flex-col">
                                          <span>{ing.name}</span>
                                          <span className="text-[9px] text-natural-muted font-medium">Hao hụt thải bỏ: {ing.wasteRate}%</span>
                                        </div>
                                      </td>

                                      {/* Input Qty */}
                                      <td className="px-3 py-2.5 text-center">
                                        <div className="inline-flex items-center border border-natural-border rounded-lg overflow-hidden bg-white">
                                          <input
                                            type="number"
                                            step="any"
                                            min="0.1"
                                            value={item.quantityPerChild}
                                            onChange={(e) => handleUpdateIngredientQty(
                                              meal.id,
                                              dish.id,
                                              item.ingredientId,
                                              parseFloat(e.target.value) || 0
                                            )}
                                            className="w-16 px-1.5 py-0.5 text-center font-bold text-natural-dark focus:outline-none text-xs"
                                          />
                                        </div>
                                      </td>

                                      {/* Edible Qty Display */}
                                      <td className="px-3 py-2.5 text-center text-natural-muted font-medium">
                                        {edible.toFixed(1)}g
                                      </td>

                                      {/* Total Raw Weight needed */}
                                      <td className="px-3 py-2.5 text-center text-natural-dark font-bold">
                                        {totalRawKg.toFixed(3)} kg
                                      </td>

                                      {/* Price */}
                                      <td className="px-3 py-2.5 text-right text-natural-muted font-medium">
                                        {(ing.price).toLocaleString()}đ
                                      </td>

                                      {/* Total Cost */}
                                      <td className="px-3 py-2.5 text-right font-bold text-natural-primary">
                                        {(Math.round(totalCost)).toLocaleString()}đ
                                      </td>

                                      {/* Remove btn */}
                                      <td className="px-3 py-2.5 text-center">
                                        <button
                                          onClick={() => handleRemoveIngredient(meal.id, dish.id, item.ingredientId)}
                                          className="text-natural-muted/40 hover:text-natural-accent-orange cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CỘT PHẢI: BẢNG PHÂN TÍCH TIÊU CHUẨN TRỰC QUAN (Ration Analyzer) */}
      <div className="space-y-6">
        
        {/* Tiêu đề phân tích */}
        <div className="bg-white rounded-2xl border border-natural-border p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-extrabold text-natural-dark uppercase tracking-wide flex items-center gap-2">
              <Info className="w-5 h-5 text-natural-primary" />
              <span>Phân tích cân bằng dưỡng chất</span>
            </h2>
            <p className="text-xs text-natural-muted">Đối chiếu tự động với quy định của Bộ Giáo dục và Đào tạo</p>
          </div>

          {/* 1. Năng lượng Kcal */}
          <div className="space-y-2">
            <div className="flex justify-between items-end text-xs">
              <span className="font-bold text-natural-text">⚡ Tổng năng lượng / trẻ:</span>
              <span className="font-bold text-natural-dark">{Math.round(nutrition.energy)} / {standard.kcalMin} - {standard.kcalMax} Kcal</span>
            </div>
            
            {/* Kcal bar indicator */}
            <div className="relative h-2.5 w-full bg-natural-light rounded-full overflow-hidden border border-natural-border/30">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  checks.energyStatus === 'ok' 
                    ? 'bg-natural-primary' 
                    : checks.energyStatus === 'low' 
                      ? 'bg-natural-accent-orange' 
                      : 'bg-natural-primary-hover'
                }`}
                style={{ width: `${Math.min(100, (nutrition.energy / standard.kcalMax) * 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-natural-muted font-semibold">
              <span>Đạt {Math.round((nutrition.energy / standard.kcalMin) * 100)}% tối thiểu</span>
              <span>
                {checks.energyStatus === 'ok' && <span className="text-natural-primary font-bold flex items-center gap-0.5">● Đạt chuẩn Kcal</span>}
                {checks.energyStatus === 'low' && <span className="text-natural-accent-orange font-bold flex items-center gap-0.5">⚠️ Thiếu năng lượng</span>}
                {checks.energyStatus === 'high' && <span className="text-natural-primary-hover font-bold flex items-center gap-0.5">🚨 Thừa năng lượng</span>}
              </span>
            </div>
          </div>

          {/* 2. Tiền ăn dặm */}
          <div className="space-y-2 pt-1 border-t border-natural-border">
            <div className="flex justify-between items-end text-xs">
              <span className="font-bold text-natural-text">💰 Chi phí thực tế / trẻ:</span>
              <span className="font-bold text-natural-dark">
                {Math.round(nutrition.costPerChild).toLocaleString()} / {budgetPerChild.toLocaleString()}đ
              </span>
            </div>

            {/* Budget Progress Bar */}
            <div className="relative h-2.5 w-full bg-natural-light rounded-full overflow-hidden border border-natural-border/30">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  nutrition.costPerChild > budgetPerChild ? 'bg-natural-accent-orange' : 'bg-natural-primary'
                }`}
                style={{ width: `${Math.min(100, (nutrition.costPerChild / budgetPerChild) * 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-natural-muted font-semibold">
              <span>Đã chi {((nutrition.costPerChild / budgetPerChild) * 100 || 0).toFixed(1)}%</span>
              <span>
                {nutrition.costPerChild <= budgetPerChild ? (
                  <span className="text-natural-primary font-bold">✓ Cân bằng tài chính</span>
                ) : (
                  <span className="text-natural-accent-orange font-bold">⚠️ Vượt định mức {(nutrition.costPerChild - budgetPerChild).toLocaleString()}đ</span>
                )}
              </span>
            </div>
          </div>

          {/* 3. Tỉ lệ sinh nhiệt Protein - Lipid - Glucid (P-L-G) */}
          <div className="space-y-3 pt-3 border-t border-natural-border">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-natural-text">📊 Tỉ lệ phần trăm năng lượng (P - L - G):</span>
              <span className="text-[10px] bg-natural-light border border-natural-border px-1.5 py-0.5 rounded font-medium text-natural-muted">Mục tiêu: {standard.proteinPctMin}-{standard.proteinPctMax}% / {standard.lipidPctMin}-{standard.lipidPctMax}% / {standard.carbohydratePctMin}-{standard.carbohydratePctMax}%</span>
            </div>

            {/* Segmented bar graph */}
            <div className="h-6 w-full rounded-xl overflow-hidden flex font-bold text-[10px] text-white border border-natural-border/30">
              {nutrition.totalKcalCalculated > 0 ? (
                <>
                  <div 
                    className="bg-natural-primary flex items-center justify-center transition-all duration-300 hover:opacity-90"
                    style={{ width: `${nutrition.proteinPct}%` }}
                    title={`Đạm (Protein): ${nutrition.proteinPct.toFixed(1)}%`}
                  >
                    {nutrition.proteinPct > 8 && `P:${Math.round(nutrition.proteinPct)}%`}
                  </div>
                  <div 
                    className="bg-natural-accent-orange flex items-center justify-center transition-all duration-300 hover:opacity-90 text-white"
                    style={{ width: `${nutrition.lipidPct}%` }}
                    title={`Béo (Lipid): ${nutrition.lipidPct.toFixed(1)}%`}
                  >
                    {nutrition.lipidPct > 8 && `L:${Math.round(nutrition.lipidPct)}%`}
                  </div>
                  <div 
                    className="bg-natural-accent-green flex items-center justify-center transition-all duration-300 hover:opacity-90 text-natural-primary"
                    style={{ width: `${nutrition.carbohydratePct}%` }}
                    title={`Đường bột (Glucid): ${nutrition.carbohydratePct.toFixed(1)}%`}
                  >
                    {nutrition.carbohydratePct > 8 && `G:${Math.round(nutrition.carbohydratePct)}%`}
                  </div>
                </>
              ) : (
                <div className="bg-natural-light text-natural-muted w-full flex items-center justify-center font-normal">
                  Chưa có nguyên liệu sinh nhiệt
                </div>
              )}
            </div>

            {/* Details and warnings for P-L-G */}
            <div className="space-y-2 text-xs font-semibold">
              {/* Protein indicator */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-natural-primary rounded-sm"></span>
                  <span className="text-natural-text">🥩 Đạm (Protein):</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-natural-dark font-bold">{nutrition.proteinPct.toFixed(1)}%</span>
                  {checks.proteinStatus === 'ok' ? (
                    <span className="text-[10px] text-natural-primary font-extrabold bg-natural-accent-green/30 px-1 rounded">Đạt</span>
                  ) : (
                    <span className="text-[10px] text-natural-accent-orange font-extrabold bg-natural-accent-orange/15 px-1 rounded">Lệch</span>
                  )}
                </div>
              </div>

              {/* Lipid indicator */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-natural-accent-orange rounded-sm"></span>
                  <span className="text-natural-text">🥑 Chất béo (Lipid):</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-natural-dark font-bold">{nutrition.lipidPct.toFixed(1)}%</span>
                  {checks.lipidStatus === 'ok' ? (
                    <span className="text-[10px] text-natural-primary font-extrabold bg-natural-accent-green/30 px-1 rounded">Đạt</span>
                  ) : (
                    <span className="text-[10px] text-natural-accent-orange font-extrabold bg-natural-accent-orange/15 px-1 rounded">Lệch</span>
                  )}
                </div>
              </div>

              {/* Glucid indicator */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-natural-accent-green border border-natural-primary/20 rounded-sm"></span>
                  <span className="text-natural-text">🍚 Đường bột (Glucid):</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-natural-dark font-bold">{nutrition.carbohydratePct.toFixed(1)}%</span>
                  {checks.carbohydrateStatus === 'ok' ? (
                    <span className="text-[10px] text-natural-primary font-extrabold bg-natural-accent-green/30 px-1 rounded">Đạt</span>
                  ) : (
                    <span className="text-[10px] text-natural-accent-orange font-extrabold bg-natural-accent-orange/15 px-1 rounded">Lệch</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Vi chất Canxi & Sắt */}
          <div className="space-y-3 pt-3 border-t border-natural-border text-xs">
            <span className="font-bold text-natural-text">🧱 Vi chất tối thiểu cần bổ sung:</span>
            
            <div className="grid grid-cols-2 gap-3 text-center font-semibold">
              <div className="bg-natural-light p-2.5 rounded-xl border border-natural-border space-y-1">
                <span className="text-[10px] font-bold text-natural-muted uppercase">🥛 Canxi (Calcium)</span>
                <p className="font-extrabold text-natural-dark">{Math.round(nutrition.calcium)} / {standard.calciumMin} mg</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block ${checks.calciumStatus === 'ok' ? 'bg-natural-accent-green/30 text-natural-primary' : 'bg-natural-accent-orange/15 text-natural-accent-orange'}`}>
                  {checks.calciumStatus === 'ok' ? 'Đầy đủ' : 'Hơi thiếu'}
                </span>
              </div>

              <div className="bg-natural-light p-2.5 rounded-xl border border-natural-border space-y-1">
                <span className="text-[10px] font-bold text-natural-muted uppercase">🧱 Sắt (Iron)</span>
                <p className="font-extrabold text-natural-dark">{nutrition.iron.toFixed(1)} / {standard.ironMin} mg</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-block ${checks.ironStatus === 'ok' ? 'bg-natural-accent-green/30 text-natural-primary' : 'bg-natural-accent-orange/15 text-natural-accent-orange'}`}>
                  {checks.ironStatus === 'ok' ? 'Đầy đủ' : 'Hơi thiếu'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin tuyên ngôn sức khỏe */}
        <div className="bg-natural-panel rounded-2xl p-5 border border-natural-border text-xs text-natural-text space-y-2">
          <h4 className="font-bold text-natural-dark flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-natural-accent-orange" />
            <span>Mẹo điều chỉnh thực đơn nhanh</span>
          </h4>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-natural-text/90 font-semibold">
            <li>Nếu <b>thiếu chất béo (Lipid)</b>: Tăng lượng <b>dầu ăn, mỡ nước, bơ miếng</b> hoặc phô mai miếng.</li>
            <li>Nếu <b>thiếu đạm (Protein)</b>: Bổ sung <b>thịt heo nạc, thịt gà, tôm đồng, cua đồng</b> hoặc sữa bột.</li>
            <li>Nếu <b>thiếu Canxi</b>: Hãy ưu tiên sử dụng <b>sữa tươi tiệt trùng, trứng hoặc sườn thăn</b> dăm bông.</li>
          </ul>
        </div>
      </div>

      {/* MODAL: CHỌN MỞ THỰC ĐƠN MẪU / ĐÃ LƯU */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-natural-dark/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden border border-natural-border">
            <div className="px-6 py-4 bg-natural-panel border-b border-natural-border flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-natural-dark">Thực đơn học đường</h3>
                <p className="text-xs text-natural-muted">Mở thực đơn mẫu có sẵn hoặc tải thực đơn đã lưu của bạn</p>
              </div>
              <button onClick={() => setShowLoadModal(false)} className="text-natural-muted hover:text-natural-dark cursor-pointer p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-grow bg-natural-light/40">
              {/* Sample section */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-natural-muted uppercase tracking-wider">Thực đơn đề cử (Chuẩn dinh dưỡng)</h4>
                <div className="space-y-2">
                  {recommendedMenus.map((sample) => (
                    <button
                      key={sample.id}
                      onClick={() => handleLoadSample(sample)}
                      className="w-full text-left bg-white border border-natural-border hover:border-natural-primary p-4 rounded-xl flex justify-between items-center group cursor-pointer transition-all hover:shadow-xs"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-natural-dark group-hover:text-natural-primary">{sample.name}</span>
                        <div className="flex gap-4 text-[10px] text-natural-muted font-semibold">
                          <span>👶 {sample.ageGroup === 'nha_tre_12_36' ? 'Nhà trẻ' : sample.ageGroup === 'lop_ghep' ? 'Lớp ghép' : 'Mẫu giáo'}</span>
                          <span>👥 {sample.childrenCount} trẻ</span>
                          <span>💰 {sample.budgetPerChild.toLocaleString()}đ/trẻ</span>
                        </div>
                      </div>
                      <Sparkles className="w-4 h-4 text-natural-primary group-hover:scale-110 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved section */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-natural-muted uppercase tracking-wider">Thực đơn do bạn đã lưu</h4>
                {savedMenus.length === 0 ? (
                  <p className="text-xs text-natural-muted italic py-4 text-center">Chưa có thực đơn tự lập nào được lưu trữ</p>
                ) : (
                  <div className="space-y-2">
                    {savedMenus.map((menu) => (
                      <div
                        key={menu.id}
                        onClick={() => handleLoadSample(menu)}
                        className="w-full text-left bg-white border border-natural-border hover:border-natural-primary p-4 rounded-xl flex justify-between items-center group cursor-pointer transition-all hover:shadow-xs"
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-natural-dark group-hover:text-natural-primary">{menu.name}</span>
                          <div className="flex gap-4 text-[10px] text-natural-muted font-semibold">
                            <span>👶 {menu.ageGroup === 'nha_tre_12_36' ? 'Nhà trẻ' : menu.ageGroup === 'lop_ghep' ? 'Lớp ghép' : 'Mẫu giáo'}</span>
                            <span>👥 {menu.childrenCount} trẻ</span>
                            <span>💰 {menu.budgetPerChild.toLocaleString()}đ/trẻ</span>
                            <span>📅 {menu.updatedAt}</span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSaved(menu.id, e)}
                          className="p-1.5 bg-natural-light hover:bg-natural-accent-orange/15 text-natural-muted hover:text-natural-accent-orange rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LƯU THỰC ĐƠN HIỆN TẠI */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-natural-dark/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-natural-border">
            <div className="px-6 py-4 bg-natural-panel border-b border-natural-border flex justify-between items-center">
              <h3 className="text-sm font-bold text-natural-dark">Lưu thực đơn hôm nay</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-natural-muted hover:text-natural-dark cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveMenu} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-natural-muted">Đặt tên thực đơn</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thực đơn Thứ Năm ngày 15/07..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 border border-natural-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-natural-primary font-semibold text-natural-dark"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 border border-natural-border hover:bg-natural-light rounded-xl text-natural-muted font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-natural-primary hover:bg-natural-primary-hover text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  Lưu trữ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELECTOR MODAL COMPONENT */}
      {selectorActive && (
        <IngredientSelector
          ingredients={ingredients}
          onSelect={handleSelectIngredient}
          onClose={() => setSelectorActive(null)}
        />
      )}

    </div>
  );
}
