/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Database, FileText, BookOpen, Settings, 
  HelpCircle, Heart, Flame, Sparkles, Cloud, CloudOff, RefreshCw
} from 'lucide-react';
import { Ingredient, Meal, AgeGroup } from './types';
import { INITIAL_INGREDIENTS } from './data/ingredients';
import MenuPlanner from './components/MenuPlanner';
import IngredientManager from './components/IngredientManager';
import ReportViewer from './components/ReportViewer';
import InstructionDoc from './components/InstructionDoc';
import { getIngredientsFromFirebase, saveIngredientsToFirebase } from './lib/firebase';

// Thực đơn mặc định nạp sẵn khi khởi chạy (Thực đơn mẫu 1)
const DEFAULT_MEALS: Meal[] = [
  {
    id: 'meal_sáng',
    name: 'Bữa sáng chính (07:30)',
    dishes: [
      {
        id: 'dish_cháo_heo',
        name: 'Cháo thịt heo nạc rau ngót ta',
        ingredients: [
          { ingredientId: 'tinh_bot_01', quantityPerChild: 45 }, // Gạo tẻ máy
          { ingredientId: 'thit_thuy_san_01', quantityPerChild: 25 }, // Thịt lợn nạc
          { ingredientId: 'rau_cu_qua_01', quantityPerChild: 15 }, // Rau ngót tươi ta
          { ingredientId: 'chat_beo_01', quantityPerChild: 3 }, // Dầu ăn
          { ingredientId: 'gia_vi_03', quantityPerChild: 1.5 }, // Nước mắm
        ]
      }
    ]
  },
  {
    id: 'meal_trưa',
    name: 'Bữa trưa dinh dưỡng (10:30)',
    dishes: [
      {
        id: 'dish_súp_bắp_gà',
        name: 'Cháo gà hầm bí đỏ hạt sen thơm dẻo',
        ingredients: [
          { ingredientId: 'tinh_bot_01', quantityPerChild: 50 }, // Gạo tẻ máy
          { ingredientId: 'thit_thuy_san_06', quantityPerChild: 25 }, // Ức gà phi lê
          { ingredientId: 'rau_cu_qua_05', quantityPerChild: 25 }, // Bí đỏ ta
          { ingredientId: 'rau_cu_qua_25', quantityPerChild: 12 }, // Hạt sen tươi bóc vỏ
          { ingredientId: 'chat_beo_01', quantityPerChild: 3 }, // Dầu ăn
          { ingredientId: 'gia_vi_03', quantityPerChild: 1.5 }, // Nước mắm
        ]
      }
    ]
  },
  {
    id: 'meal_xế_chiều',
    name: 'Bữa phụ xế chiều (14:30)',
    dishes: [
      {
        id: 'dish_sữa_tươi',
        name: 'Sữa tươi tiệt trùng cùng Bơ sáp dầm',
        ingredients: [
          { ingredientId: 'sua_trung_01', quantityPerChild: 120 }, // Sữa tươi tiệt trùng
          { ingredientId: 'trai_cay_15', quantityPerChild: 30 }, // Bơ sáp ngậy
          { ingredientId: 'gia_vi_01', quantityPerChild: 4 }, // Đường cát
        ]
      }
    ]
  }
];

export default function App() {
  // 1. Trạng thái cơ sở dữ liệu thực phẩm (Đồng bộ hai chiều với Google Cloud Firestore và LocalStorage làm dự phòng)
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    const saved = localStorage.getItem('HUONG_DUONG_INGREDIENTS');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Lỗi parse dữ liệu thực phẩm", e);
      }
    }
    return INITIAL_INGREDIENTS;
  });

  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  // Tải cơ sở dữ liệu thực phẩm từ Google Cloud (Firestore)
  useEffect(() => {
    async function loadCloudData() {
      try {
        setDbStatus('connecting');
        const cloudIngredients = await getIngredientsFromFirebase();
        if (cloudIngredients && cloudIngredients.length > 0) {
          setIngredients(cloudIngredients);
          console.log("Đã nạp danh mục thực phẩm từ Google Cloud Database.");
        } else {
          // Nếu database chưa có dữ liệu, khởi tạo dữ liệu mẫu lên đám mây
          await saveIngredientsToFirebase(ingredients);
          console.log("Đã khởi tạo danh mục thực phẩm mặc định lên Google Cloud.");
        }
        setDbStatus('connected');
      } catch (err) {
        console.error("Lỗi kết nối Google Cloud Database:", err);
        setDbStatus('error');
      } finally {
        setIsDbLoaded(true);
      }
    }
    loadCloudData();
  }, []);

  // Đồng bộ thực phẩm lên Google Cloud khi có thay đổi từ người dùng
  useEffect(() => {
    if (isDbLoaded) {
      localStorage.setItem('HUONG_DUONG_INGREDIENTS', JSON.stringify(ingredients));
      saveIngredientsToFirebase(ingredients).catch(err => {
        console.error("Không thể đồng bộ thực phẩm lên đám mây:", err);
        setDbStatus('error');
      });
    }
  }, [ingredients, isDbLoaded]);

  // 2. Trạng thái thực đơn hiện tại đang xây dựng
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('lop_ghep');
  const [childrenCount, setChildrenCount] = useState<number>(57);
  const [budgetPerChild, setBudgetPerChild] = useState<number>(35000);
  const [date, setDate] = useState<string>('2026-07-13');
  const [meals, setMeals] = useState<Meal[]>(DEFAULT_MEALS);

  // 3. Tab định tuyến
  const [activeTab, setActiveTab] = useState<'planner' | 'reports' | 'database' | 'docs'>('planner');

  // Tự động giữ vững hoặc khôi phục về thiết lập mặc định khi chọn/thay đổi các trường thông tin khác
  useEffect(() => {
    setAgeGroup('lop_ghep');
    setChildrenCount(57);
    setBudgetPerChild(35000);
  }, [activeTab, date]);

  // Thêm mới thực phẩm tùy chọn
  const handleAddIngredient = (newIng: Ingredient) => {
    setIngredients([newIng, ...ingredients]);
  };

  // Cập nhật giá cả, tỉ lệ thải bỏ
  const handleUpdateIngredient = (updatedIng: Ingredient) => {
    setIngredients(ingredients.map(item => item.id === updatedIng.id ? updatedIng : item));
  };

  // Xóa thực phẩm tùy chọn
  const handleDeleteIngredient = (id: string) => {
    setIngredients(ingredients.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col font-sans text-natural-text antialiased selection:bg-natural-primary/10 selection:text-natural-primary">
      
      {/* HEADER DASHBOARD BANNER */}
      <header className="bg-natural-panel border-b border-natural-border sticky top-0 z-40 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-natural-primary rounded-xl flex items-center justify-center text-white shadow-md shadow-natural-primary/25">
                <ChefHat className="w-5.5 h-5.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-extrabold text-natural-dark tracking-tight">LỚP MẪU GIÁO HƯỚNG DƯƠNG 2</span>
                  <span className="bg-natural-accent-orange/20 text-natural-primary text-[10px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">Mầm non</span>
                  
                  {/* Google Cloud DB Status Badge */}
                  <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                    dbStatus === 'connected' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : dbStatus === 'connecting'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      dbStatus === 'connected' ? 'bg-emerald-500' : dbStatus === 'connecting' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                    <Cloud className="w-3 h-3" />
                    <span className="hidden sm:inline">Google Cloud DB</span>
                  </div>
                </div>
                <h1 className="text-xs font-semibold text-natural-muted">Phần mềm Dinh dưỡng Cấp dưỡng Học đường</h1>
              </div>
            </div>

            {/* Navigation Tabs bar */}
            <nav className="flex space-x-1 bg-white/50 border border-natural-border p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('planner')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'planner'
                    ? 'bg-natural-primary text-white shadow-sm'
                    : 'text-natural-text hover:bg-natural-hover hover:text-natural-dark'
                }`}
              >
                <ChefHat className={`w-4 h-4 ${activeTab === 'planner' ? 'text-white' : 'text-natural-primary'}`} />
                <span>Thiết kế Thực đơn</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'reports'
                    ? 'bg-natural-primary text-white shadow-sm'
                    : 'text-natural-text hover:bg-natural-hover hover:text-natural-dark'
                }`}
              >
                <FileText className={`w-4 h-4 ${activeTab === 'reports' ? 'text-white' : 'text-natural-primary'}`} />
                <span>Báo cáo & Đi chợ</span>
              </button>

              <button
                onClick={() => setActiveTab('database')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'database'
                    ? 'bg-natural-primary text-white shadow-sm'
                    : 'text-natural-text hover:bg-natural-hover hover:text-natural-dark'
                }`}
              >
                <Database className={`w-4 h-4 ${activeTab === 'database' ? 'text-white' : 'text-natural-primary'}`} />
                <span>Kho Thực phẩm ({ingredients.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('docs')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'docs'
                    ? 'bg-natural-primary text-white shadow-sm'
                    : 'text-natural-text hover:bg-natural-hover hover:text-natural-dark'
                }`}
              >
                <BookOpen className={`w-4 h-4 ${activeTab === 'docs' ? 'text-white' : 'text-natural-primary'}`} />
                <span>Tài liệu Kỹ thuật</span>
              </button>
            </nav>

            {/* Sub branding credits */}
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-natural-muted bg-white/50 px-3 py-1.5 rounded-full border border-natural-border">
              <Sparkles className="w-3.5 h-3.5 text-natural-accent-orange" />
              <span>Chế độ: Đầy đủ (Expert)</span>
            </div>

          </div>
        </div>
      </header>

      {/* CORE ACTIVE WORKSPACE */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Render Active View Router */}
        {activeTab === 'planner' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-natural-primary to-natural-primary-hover rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="space-y-1">
                <span className="bg-white/15 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Sunflower Nutri v1.0</span>
                <h2 className="text-xl font-black">Xây dựng khẩu phần học đường tiêu chuẩn</h2>
                <p className="text-xs text-natural-light/80 max-w-xl">
                  Nhập số lượng trẻ, chọn độ tuổi để phần mềm tự động tra cứu Tiêu chuẩn Dinh dưỡng Việt Nam và cân đối tỉ lệ calo và đạm, béo, đường tức thì.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="bg-white/10 px-3 py-2 rounded-xl text-center min-w-24">
                  <span className="text-[10px] text-natural-light/70 block uppercase font-bold">120+ Món</span>
                  <p className="text-base font-extrabold text-white">Thực phẩm</p>
                </div>
                <div className="bg-white/10 px-3 py-2 rounded-xl text-center min-w-24">
                  <span className="text-[10px] text-natural-light/70 block uppercase font-bold">Thông tư 28</span>
                  <p className="text-base font-extrabold text-white">Chuẩn GD&ĐT</p>
                </div>
              </div>
            </div>

            <MenuPlanner
              ingredients={ingredients}
              activeMealState={{
                ageGroup, setAgeGroup,
                childrenCount, setChildrenCount,
                budgetPerChild, setBudgetPerChild,
                meals, setMeals,
                date, setDate
              }}
            />
          </div>
        )}

        {activeTab === 'reports' && (
          <ReportViewer
            meals={meals}
            ingredientsDb={ingredients.reduce((acc, cur) => {
              acc[cur.id] = cur;
              return acc;
            }, {} as Record<string, Ingredient>)}
            childrenCount={childrenCount}
            budgetPerChild={budgetPerChild}
            ageGroup={ageGroup}
            dateString={date}
          />
        )}

        {activeTab === 'database' && (
          <IngredientManager
            ingredients={ingredients}
            onAddIngredient={handleAddIngredient}
            onUpdateIngredient={handleUpdateIngredient}
            onDeleteIngredient={handleDeleteIngredient}
          />
        )}

        {activeTab === 'docs' && (
          <InstructionDoc />
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-natural-panel border-t border-natural-border py-6 mt-12 text-center text-xs text-natural-muted print:hidden">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-semibold text-natural-dark">Phần mềm Quản lý Dinh dưỡng mầm non Lớp mẫu giáo Hướng Dương 2</p>
          <p className="text-[11px] text-natural-muted/80">© 2026 Toàn quyền được bảo hộ. Thiết kế tuân thủ biểu mẫu Viện Dinh dưỡng Quốc gia & Bộ GD&ĐT Việt Nam</p>
          <div className="flex justify-center items-center gap-1.5 text-natural-primary font-bold text-[10px] uppercase">
            <Heart className="w-3.5 h-3.5 fill-natural-primary" />
            <span>Phục vụ sự nghiệp cấp dưỡng nuôi bé lớn khỏe</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
