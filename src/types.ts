/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Định nghĩa Nhóm Thực phẩm
export type IngredientCategory =
  | 'tinh_bot'       // Lương thực (gạo, khoai, mì,...)
  | 'thit_thuy_san'  // Thịt và thủy sản (heo, bò, gà, tôm, cá,...)
  | 'sua_trung'      // Trứng và Sữa
  | 'chat_beo'       // Dầu, mỡ, bơ
  | 'rau_cu_qua'     // Rau củ quả chế biến
  | 'trai_cay'       // Trái cây tráng miệng
  | 'gia_vi_khac';    // Gia vị và các loại khác

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  wasteRate: number;      // Tỉ lệ thải bỏ (%) - ví dụ: Rau ngót nhặt rễ bỏ lá úa là 15%, thịt heo bỏ bì xơ là 5%
  energy: number;         // Năng lượng (Kcal / 100g thực phẩm ăn được)
  protein: number;        // Đạm (g / 100g thực phẩm ăn được)
  lipid: number;          // Béo (g / 100g thực phẩm ăn được)
  carbohydrate: number;   // Đường bột (g / 100g thực phẩm ăn được)
  calcium: number;        // Canxi (mg / 100g thực phẩm ăn được)
  iron: number;           // Sắt (mg / 100g thực phẩm ăn được)
  price: number;          // Giá mua thực tế (VNĐ / kg thực phẩm nguyên bản)
  isCustom?: boolean;     // Đánh dấu thực phẩm do người dùng thêm mới
}

// Định nghĩa Nhóm Tuổi và Tiêu chuẩn Dinh dưỡng Việt Nam (Bộ Giáo dục & Đào tạo)
export type AgeGroup = 'nha_tre_12_36' | 'mau_giao_3_6' | 'lop_ghep';

export interface NutritionStandard {
  ageGroupId: AgeGroup;
  ageGroupName: string;
  kcalMin: number;        // Năng lượng tối thiểu cần đạt ở trường một ngày (Kcal/trẻ)
  kcalMax: number;        // Năng lượng tối đa đề xuất ở trường một ngày (Kcal/trẻ)
  proteinPctMin: number;  // Tỉ lệ Đạm tối thiểu (%) trong tổng năng lượng (thường 13%)
  proteinPctMax: number;  // Tỉ lệ Đạm tối đa (%) (thường 20%)
  lipidPctMin: number;    // Tỉ lệ Béo tối thiểu (%) (thường 25%)
  lipidPctMax: number;    // Tỉ lệ Béo tối đa (%) (thường 35%)
  carbohydratePctMin: number; // Tỉ lệ Đường bột tối thiểu (%) (thường 52%)
  carbohydratePctMax: number; // Tỉ lệ Đường bột tối đa (%) (thường 60%)
  calciumMin: number;     // Canxi tối thiểu cần đạt ở trường (mg/trẻ/ngày)
  ironMin: number;        // Sắt tối thiểu cần đạt ở trường (mg/trẻ/ngày)
}

// Cấu trúc một thực phẩm được đưa vào thực đơn khẩu phần
export interface MenuIngredient {
  ingredientId: string;
  quantityPerChild: number; // Số gram thô đầu vào cho 1 trẻ (g/trẻ)
}

// Cấu trúc món ăn trong thực đơn
export interface Dish {
  id: string;
  name: string;             // Tên món ăn (Ví dụ: "Cháo thịt băm rau ngót")
  ingredients: MenuIngredient[];
}

// Cấu trúc bữa ăn trong ngày (Ví dụ: Bữa sáng, Bữa trưa, Bữa xế)
export interface Meal {
  id: string;
  name: string;             // Tên bữa ăn (Sáng, Trưa, Phụ chiều)
  dishes: Dish[];
}

// Thông tin đầu vào của một ngày tính khẩu phần
export interface RationInput {
  ageGroup: AgeGroup;
  childrenCount: number;    // Số lượng trẻ ăn (cháu)
  budgetPerChild: number;   // Định mức tiền ăn của 1 trẻ / ngày (VNĐ/trẻ)
  date: string;             // Ngày tính khẩu phần (YYYY-MM-DD)
  meals: Meal[];            // Danh sách bữa ăn và món ăn trong ngày
}

// Kết quả tính toán dinh dưỡng chi tiết
export interface NutrientSummary {
  energy: number;           // Kcal thực tế đạt được / trẻ
  protein: number;          // Gram Đạm đạt được / trẻ
  lipid: number;            // Gram Béo đạt được / trẻ
  carbohydrate: number;     // Gram Đường bột đạt được / trẻ
  calcium: number;          // mg Canxi đạt được / trẻ
  iron: number;             // mg Sắt đạt được / trẻ
  proteinKcal: number;      // Kcal từ Đạm / trẻ
  lipidKcal: number;        // Kcal từ Béo / trẻ
  carbohydrateKcal: number; // Kcal từ Đường bột / trẻ
  totalKcalCalculated: number; // Tổng kcal dựa trên hệ số 4-9-4 (để tính tỉ lệ P-L-G chuẩn xác)
  proteinPct: number;       // Tỉ lệ năng lượng từ Đạm (%)
  lipidPct: number;         // Tỉ lệ năng lượng từ Béo (%)
  carbohydratePct: number;  // Tỉ lệ năng lượng từ Đường bột (%)
  totalCost: number;        // Tổng chi phí mua thực phẩm (VNĐ)
  costPerChild: number;     // Chi phí thực tế / trẻ (VNĐ/trẻ)
}

// Kết quả so sánh với tiêu chuẩn để đưa ra cảnh báo
export interface StandardCheckResult {
  energyStatus: 'ok' | 'low' | 'high';
  proteinStatus: 'ok' | 'low' | 'high';
  lipidStatus: 'ok' | 'low' | 'high';
  carbohydrateStatus: 'ok' | 'low' | 'high';
  calciumStatus: 'ok' | 'low';
  ironStatus: 'ok' | 'low';
  budgetStatus: 'ok' | 'over'; // Vượt ngân sách hay đạt
}

// Bản ghi lịch sử thực đơn đã lưu trữ
export interface SavedMenu {
  id: string;
  name: string;             // Tên thực đơn (Ví dụ: "Thực đơn Thứ Hai - Tuần 1")
  ageGroup: AgeGroup;
  childrenCount: number;
  budgetPerChild: number;
  meals: Meal[];
  updatedAt: string;
}
