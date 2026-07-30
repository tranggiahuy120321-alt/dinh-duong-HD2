/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, FolderTree, Database, Calculator, Copy, Check } from 'lucide-react';

export default function InstructionDoc() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const b1Text = `📂 CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT STRUCTURE)
--------------------------------------------------
/
├── .env.example            # Khai báo các biến môi trường mẫu (API Key, App URL)
├── .gitignore              # Chỉ định các file và thư mục Git không theo dõi
├── index.html              # Điểm neo HTML duy nhất của ứng dụng Single Page (SPA)
├── metadata.json           # Siêu dữ liệu cấu hình quyền hạn và tên ứng dụng
├── package.json            # Quản lý thư viện phụ thuộc (Dependencies) và các script chạy/build
├── tsconfig.json           # Cấu hình biên dịch ngôn ngữ TypeScript
├── vite.config.ts          # Cấu hình bundler Vite (máy chủ dev, cổng 3000, alias đường dẫn)
└── src/
    ├── main.tsx            # Entry point chính của ứng dụng React, khởi chạy và render App
    ├── index.css           # CSS toàn cục tích hợp Tailwind CSS v4 mới nhất
    ├── types.ts            # Khai báo toàn bộ kiểu dữ liệu (TypeScript Interfaces, Enums, Schemas)
    ├── data/
    │   ├── standards.ts    # Tiêu chuẩn dinh dưỡng Bộ GD&ĐT Việt Nam (Circular 28/2016 & 12/2020)
    │   └── ingredients.ts  # Cơ sở dữ liệu chứa hơn 100 loại thực phẩm Việt Nam (Viện Dinh dưỡng)
    ├── utils/
    │   └── calculator.ts   # Công thức toán dinh dưỡng, hao hụt thải bỏ, tỷ lệ P-L-G và chi phí
    ├── components/
    │   ├── InstructionDoc.tsx   # Hiển thị tài liệu kỹ thuật & câu trả lời B1, B2, B3 (Thành phần này)
    │   ├── MenuPlanner.tsx      # Bộ xây dựng thực đơn, bữa ăn, món ăn & tính toán thời gian thực
    │   ├── IngredientSelector.tsx # Hộp thoại tìm kiếm, lọc nhóm và chọn nguyên liệu học đường
    │   ├── IngredientManager.tsx  # Giao diện quản lý, chỉnh sửa giá/thải bỏ, thêm thực phẩm mới
    │   ├── ReportViewer.tsx     # Bộ kết xuất Phiếu đi chợ thô và Sổ tính khẩu phần ăn tiêu chuẩn
    │   └── RationSheetPrint.tsx  # Giao diện in ấn và kết xuất file PDF tinh gọn tối ưu khổ giấy
    └── App.tsx             # Điều phối trung tâm, quản lý trạng thái chính của ứng dụng`;

  const b2Text = `💾 CƠ SỞ DỮ LIỆU THỰC PHẨM (DATABASE SCHEMA & 5 SAMPLES)
------------------------------------------------------------------
1. KHUNG THUỘC TÍNH (SCHEMA):
- id: Kiểu chuỗi (string) - Khóa chính duy nhất.
- name: Kiểu chuỗi (string) - Tên thực phẩm thực tế (Tiếng Việt).
- category: Danh mục thực phẩm (IngredientCategory: 'tinh_bot' | 'thit_thuy_san' | 'sua_trung' | 'chat_beo' | 'rau_cu_qua' | 'trai_cay' | 'gia_vi_khac').
- wasteRate: Kiểu số (number) - Tỷ lệ thải bỏ của thực phẩm thô (%).
- energy: Kiểu số (number) - Năng lượng cung cấp (Kcal/100g phần ăn được - Edible).
- protein: Kiểu số (number) - Đạm thực tế (g/100g phần ăn được).
- lipid: Kiểu số (number) - Chất béo thực tế (g/100g phần ăn được).
- carbohydrate: Kiểu số (number) - Đường bột thực tế (g/100g phần ăn được).
- calcium: Kiểu số (number) - Canxi thực tế (mg/100g phần ăn được).
- iron: Kiểu số (number) - Sắt thực tế (mg/100g phần ăn được).
- price: Kiểu số (number) - Giá thị trường thô lúc mua sắm (VNĐ/kg thực phẩm thô).

2. CHỈ SỐ DINH DƯỠNG CHUẨN XÁC CỦA 5 THỰC PHẨM MẪU (Theo Viện Dinh dưỡng Quốc gia):
[
  {
    "id": "tinh_bot_01",
    "name": "Gạo tẻ máy",
    "category": "tinh_bot",
    "wasteRate": 0,          // Không có vỏ thải bỏ thêm khi đong nấu
    "energy": 344,           // Kcal / 100g
    "protein": 7.9,          // g / 100g
    "lipid": 1.0,            // g / 100g
    "carbohydrate": 75.9,    // g / 100g
    "calcium": 30,           // mg / 100g
    "iron": 1.3,             // mg / 100g
    "price": 20000           // VNĐ/kg
  },
  {
    "id": "thit_thuy_san_01",
    "name": "Thịt lợn nạc loin",
    "category": "thit_thuy_san",
    "wasteRate": 0,          // Nạc tinh lọc sạch bì xơ mỡ sụn
    "energy": 139,           // Kcal / 100g
    "protein": 19.0,         // g / 100g
    "lipid": 7.0,            // g / 100g
    "carbohydrate": 0,       // g / 100g
    "calcium": 10,           // mg / 100g
    "iron": 1.0,             // mg / 100g
    "price": 130000          // VNĐ/kg
  },
  {
    "id": "sua_trung_01",
    "name": "Sữa tươi tiệt trùng",
    "category": "sua_trung",
    "wasteRate": 0,          // Phần uống được 100%
    "energy": 60,            // Kcal / 100g
    "protein": 3.0,          // g / 100g
    "lipid": 3.2,            // g / 100g
    "carbohydrate": 4.8,     // g / 100g
    "calcium": 110,          // mg / 100g
    "iron": 0.1,             // mg / 100g
    "price": 35000           // VNĐ/kg (ước lượng lít sấp sỉ)
  },
  {
    "id": "chat_beo_01",
    "name": "Dầu ăn tinh luyện",
    "category": "chat_beo",
    "wasteRate": 0,          // Ăn được toàn bộ
    "energy": 896,           // Kcal / 100g
    "protein": 0,            // g / 100g
    "lipid": 99.6,           // g / 100g
    "carbohydrate": 0,       // g / 100g
    "calcium": 0,            // mg / 100g
    "iron": 0,               // mg / 100g
    "price": 45000           // VNĐ/kg
  },
  {
    "id": "rau_cu_qua_01",
    "name": "Rau ngót tươi ta",
    "category": "rau_cu_qua",
    "wasteRate": 42,         // Thải bỏ thân cọng cứng rễ bẩn chiếm 42% trọng lượng mua thô
    "energy": 35,            // Kcal / 100g ăn được
    "protein": 5.3,          // g / 100g ăn được
    "lipid": 0,              // g / 100g ăn được
    "carbohydrate": 3.4,     // g / 100g ăn được
    "calcium": 169,          // mg / 100g ăn được
    "iron": 2.7,             // mg / 100g ăn được
    "price": 25000           // VNĐ/kg thực tế thô cả bó
  }
]`;

  const b3Text = `📐 LOGIC FUNCTION (CÔNG THỨC TOÁN & CƠ CHẾ CHUYỂN ĐỔI)
-----------------------------------------------------------
1. CHUYỂN ĐỔI TỪ GRAM THÔ SANG GRAM ĂN ĐƯỢC THỰC TẾ (Edible Weight):
   - Khi cân mua thực phẩm thô (RawWeight), có một lượng xơ, rễ, vỏ, hạt, xương bị bỏ đi (WasteRate %).
   - Công thức:
     EdibleWeight (g) = RawWeight (g) * (1 - WasteRate / 100)
     
   - Ví dụ: Trẻ ăn 20g rau ngót thô. Rau ngót có tỉ lệ thải bỏ 42%. Lượng ăn được thực tế là:
     EdibleWeight = 20 * (1 - 0.42) = 11.6g rau ngót sạch.

2. TÍNH CHẤT DINH DƯỠNG THỰC TẾ ĐẠT ĐƯỢC (Nutrient Actual):
   - Chỉ số dinh dưỡng của thực phẩm lưu trữ trên 100g ăn được. Do đó, dưỡng chất cho cháu là:
     NutrientActual = (EdibleWeight (g) / 100) * NutrientPer100g
     
   - Ví dụ: Năng lượng thực tế từ 11.6g ăn được của rau ngót (35 kcal/100g):
     Energy = (11.6 / 100) * 35 = 4.06 Kcal.

3. TÍNH CHỈ SỐ NĂNG LƯỢNG TỪ BA CHẤT SINH NHIỆT P - L - G (ĐẠM - BÉO - ĐƯỜNG):
   - Theo nguyên tắc sinh nhiệt học đường:
     + 1g Đạm (Protein) = 4 Kcal
     + 1g Béo (Lipid) = 9 Kcal
     + 1g Đường bột (Carbohydrate) = 4 Kcal
   - Công thức tính Tổng năng lượng sinh nhiệt thực tế:
     TotalKcal = (Protein(g) * 4) + (Lipid(g) * 9) + (Carb(g) * 4)
     
   - Tỷ lệ phần trăm đóng góp năng lượng của mỗi nhóm:
     + Tỷ lệ Đạm (P %) = (Protein * 4 / TotalKcal) * 100
     + Tỷ lệ Béo (L %) = (Lipid * 9 / TotalKcal) * 100
     + Tỷ lệ Đường bột (G %) = (Carbohydrate * 4 / TotalKcal) * 100
     
   - Tiêu chuẩn trường học Việt Nam yêu cầu: P đạt 13-20%, L đạt 25-35%, G đạt 52-60%.

4. PHẦN TRĂM ĐẠT ĐƯỢC SO VỚI TIÊU CHUẨN KHUYẾN NGHỊ (Percent vs Standards):
   - Công thức:
     PercentOfStandard (%) = (NutrientActual / StandardValue) * 100%
     
   - Ví dụ: Nếu tổng năng lượng thực tế đạt 530 Kcal và tiêu chuẩn tối thiểu là 500 Kcal:
     PercentOfStandard = (530 / 500) * 100% = 106% (Đạt yêu cầu).`;

  return (
    <div className="bg-white rounded-2xl border border-natural-border shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-3 border-b border-natural-border pb-4">
        <div className="p-2 bg-natural-primary/10 rounded-xl text-natural-primary">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-natural-dark">Tài liệu Kỹ thuật Dự án</h2>
          <p className="text-xs text-natural-muted">Xem và sao chép cấu trúc, cơ sở dữ liệu và công thức tính khẩu phần</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* B1 Card */}
        <div className="flex flex-col bg-natural-light/30 rounded-xl p-4 border border-natural-border">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-natural-dark text-xs uppercase tracking-wider">
              <FolderTree className="w-4 h-4 text-natural-primary" />
              <span>B1: Cấu trúc thư mục</span>
            </div>
            <button
              onClick={() => handleCopy(b1Text, 'b1')}
              className="text-xs bg-white hover:bg-natural-light text-natural-text px-2 py-1 rounded border border-natural-border flex items-center gap-1 transition-colors cursor-pointer font-semibold"
            >
              {copiedSection === 'b1' ? (
                <>
                  <Check className="w-3 h-3 text-natural-primary" />
                  <span className="text-natural-primary font-bold">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-natural-muted" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-natural-muted mb-3 flex-grow font-medium">
            Cấu trúc phân mục modular tinh gọn của phần mềm dinh dưỡng mầm non viết bằng React, TypeScript & Tailwind CSS.
          </p>
          <pre className="text-[10px] font-mono text-natural-text bg-white p-3 rounded-lg border border-natural-border overflow-x-auto max-h-52 overflow-y-auto">
            {b1Text}
          </pre>
        </div>

        {/* B2 Card */}
        <div className="flex flex-col bg-natural-light/30 rounded-xl p-4 border border-natural-border">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-natural-dark text-xs uppercase tracking-wider">
              <Database className="w-4 h-4 text-natural-primary" />
              <span>B2: Database & 5 mẫu</span>
            </div>
            <button
              onClick={() => handleCopy(b2Text, 'b2')}
              className="text-xs bg-white hover:bg-natural-light text-natural-text px-2 py-1 rounded border border-natural-border flex items-center gap-1 transition-colors cursor-pointer font-semibold"
            >
              {copiedSection === 'b2' ? (
                <>
                  <Check className="w-3 h-3 text-natural-primary" />
                  <span className="text-natural-primary font-bold">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-natural-muted" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-natural-muted mb-3 flex-grow font-medium">
            Định nghĩa bảng thực phẩm (Ingredients) và các thuộc tính chuẩn xác kèm số liệu của 5 loại thực phẩm mầm non mẫu từ Viện Dinh dưỡng VN.
          </p>
          <pre className="text-[10px] font-mono text-natural-text bg-white p-3 rounded-lg border border-natural-border overflow-x-auto max-h-52 overflow-y-auto">
            {b2Text}
          </pre>
        </div>

        {/* B3 Card */}
        <div className="flex flex-col bg-natural-light/30 rounded-xl p-4 border border-natural-border">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-bold text-natural-dark text-xs uppercase tracking-wider">
              <Calculator className="w-4 h-4 text-natural-primary" />
              <span>B3: Logic & Công thức</span>
            </div>
            <button
              onClick={() => handleCopy(b3Text, 'b3')}
              className="text-xs bg-white hover:bg-natural-light text-natural-text px-2 py-1 rounded border border-natural-border flex items-center gap-1 transition-colors cursor-pointer font-semibold"
            >
              {copiedSection === 'b3' ? (
                <>
                  <Check className="w-3 h-3 text-natural-primary" />
                  <span className="text-natural-primary font-bold">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-natural-muted" />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-natural-muted mb-3 flex-grow font-medium">
            Công thức toán quy đổi từ thực phẩm dạng thô ban đầu thành dinh dưỡng tinh nạp vào cơ thể bé, tính hao phí nhặt lá/xương và quy đổi P-L-G.
          </p>
          <pre className="text-[10px] font-mono text-natural-text bg-white p-3 rounded-lg border border-natural-border overflow-x-auto max-h-52 overflow-y-auto">
            {b3Text}
          </pre>
        </div>
      </div>
    </div>
  );
}
