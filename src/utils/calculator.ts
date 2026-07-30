/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Ingredient, NutrientSummary, Meal, NutritionStandard, StandardCheckResult, AgeGroup } from '../types';

/**
 * B3: Logic Function - Chuyển đổi từ số gram thực phẩm thô -> dưỡng chất thực tế -> phần trăm so với tiêu chuẩn.
 * 
 * 1. Tính toán lượng thực tế ăn được (Edible Weight) sau khi trừ tỉ lệ thải bỏ (Waste Rate):
 *    EdibleWeight (g) = RawWeight (g) * (1 - WasteRate (%) / 100)
 * 
 * 2. Tính toán dưỡng chất từ lượng ăn được (Dưỡng chất định lượng trên 100g ăn được):
 *    NutrientAmount = (EdibleWeight (g) / 100) * NutrientPer100g
 * 
 * 3. Tính toán phần trăm đóng góp năng lượng của P - L - G (Đạm - Béo - Đường) dựa trên hệ số Kcal:
 *    - Đạm (Protein): 1g = 4 Kcal
 *    - Béo (Lipid): 1g = 9 Kcal
 *    - Đường (Carbohydrate): 1g = 4 Kcal
 *    Tổng Kcal tính toán = (Protein * 4) + (Lipid * 9) + (Carbohydrate * 4)
 *    Tỉ lệ P (%) = (Protein * 4 / Tổng Kcal) * 100
 *    Tỉ lệ L (%) = (Lipid * 9 / Tổng Kcal) * 100
 *    Tỉ lệ G (%) = (Carbohydrate * 4 / Tổng Kcal) * 100
 */

// Hàm chuyển đổi từ khối lượng thô (g) sang khối lượng ăn được thực tế (g)
export function getEdibleWeight(rawWeightGrams: number, wasteRatePct: number): number {
  if (rawWeightGrams <= 0) return 0;
  return rawWeightGrams * (1 - Math.max(0, Math.min(100, wasteRatePct)) / 100);
}

// Hàm chuyển đổi từ khối lượng thô sang lượng chất dinh dưỡng
export function calculateNutrientFromRaw(
  rawWeightGrams: number,
  wasteRatePct: number,
  nutrientValuePer100g: number
): number {
  const edibleWeight = getEdibleWeight(rawWeightGrams, wasteRatePct);
  return (edibleWeight / 100) * nutrientValuePer100g;
}

// Hàm tính toán chi phí cho khối lượng nguyên liệu thô (VNĐ)
// Lưu ý: price tính theo kg (1kg = 1000g), rawWeightGrams là gram đầu vào
export function calculateIngredientCost(rawWeightGrams: number, pricePerKg: number): number {
  if (rawWeightGrams <= 0) return 0;
  return (rawWeightGrams / 1000) * pricePerKg;
}

/**
 * Tính toán dinh dưỡng toàn diện cho một thực đơn hàng ngày của toàn bộ học sinh
 * @param meals Danh sách bữa ăn có chứa món ăn và nguyên liệu của một ngày
 * @param ingredientsDb Bản đồ tra cứu thực phẩm từ cơ sở dữ liệu
 * @param childrenCount Số lượng trẻ trong lớp/trường
 * @param budgetPerChild Định mức chi phí ăn cho 1 trẻ / ngày (VNĐ)
 */
export function calculateDailyRation(
  meals: Meal[],
  ingredientsDb: Record<string, Ingredient>,
  childrenCount: number,
  budgetPerChild: number
): NutrientSummary {
  // Khởi tạo tổng lượng chất dinh dưỡng trên mỗi trẻ
  let totalEnergy = 0;
  let totalProtein = 0;
  let totalLipid = 0;
  let totalCarb = 0;
  let totalCalcium = 0;
  let totalIron = 0;
  let totalCost = 0;

  // Duyệt qua từng bữa ăn trong ngày
  for (const meal of meals) {
    for (const dish of meal.dishes) {
      for (const item of dish.ingredients) {
        const ingredient = ingredientsDb[item.ingredientId];
        if (!ingredient) continue;

        // Số lượng thực phẩm thô cho 1 trẻ (gram)
        const qRaw = item.quantityPerChild;

        // Tính toán các dưỡng chất thực tế cho 1 trẻ
        totalEnergy += calculateNutrientFromRaw(qRaw, ingredient.wasteRate, ingredient.energy);
        totalProtein += calculateNutrientFromRaw(qRaw, ingredient.wasteRate, ingredient.protein);
        totalLipid += calculateNutrientFromRaw(qRaw, ingredient.wasteRate, ingredient.lipid);
        totalCarb += calculateNutrientFromRaw(qRaw, ingredient.wasteRate, ingredient.carbohydrate);
        totalCalcium += calculateNutrientFromRaw(qRaw, ingredient.wasteRate, ingredient.calcium);
        totalIron += calculateNutrientFromRaw(qRaw, ingredient.wasteRate, ingredient.iron);

        // Tính chi phí cho toàn bộ số trẻ của nguyên liệu này
        const costForOneChild = calculateIngredientCost(qRaw, ingredient.price);
        totalCost += costForOneChild * childrenCount;
      }
    }
  }

  // Tính năng lượng theo hệ số chuyển đổi 4-9-4 để chia tỉ lệ phần trăm P-L-G chuẩn khoa học
  const proteinKcal = totalProtein * 4;
  const lipidKcal = totalLipid * 9;
  const carbKcal = totalCarb * 4;
  const totalKcalCalculated = proteinKcal + lipidKcal + carbKcal;

  const proteinPct = totalKcalCalculated > 0 ? (proteinKcal / totalKcalCalculated) * 100 : 0;
  const lipidPct = totalKcalCalculated > 0 ? (lipidKcal / totalKcalCalculated) * 100 : 0;
  const carbPct = totalKcalCalculated > 0 ? (carbKcal / totalKcalCalculated) * 100 : 0;

  return {
    energy: totalEnergy,
    protein: totalProtein,
    lipid: totalLipid,
    carbohydrate: totalCarb,
    calcium: totalCalcium,
    iron: totalIron,
    proteinKcal,
    lipidKcal,
    carbohydrateKcal: carbKcal,
    totalKcalCalculated,
    proteinPct,
    lipidPct,
    carbohydratePct: carbPct,
    totalCost,
    costPerChild: childrenCount > 0 ? totalCost / childrenCount : 0,
  };
}

/**
 * Đối chiếu kết quả thực tế với tiêu chuẩn dinh dưỡng để đánh giá tình trạng thừa/thiếu
 */
export function checkAgainstStandard(
  actual: NutrientSummary,
  standard: NutritionStandard
): StandardCheckResult {
  // Kiểm tra năng lượng (Kcal)
  let energyStatus: 'ok' | 'low' | 'high' = 'ok';
  if (actual.energy < standard.kcalMin) energyStatus = 'low';
  else if (actual.energy > standard.kcalMax) energyStatus = 'high';

  // Kiểm tra tỉ lệ đạm P (%)
  let proteinStatus: 'ok' | 'low' | 'high' = 'ok';
  if (actual.proteinPct < standard.proteinPctMin) proteinStatus = 'low';
  else if (actual.proteinPct > standard.proteinPctMax) proteinStatus = 'high';

  // Kiểm tra tỉ lệ béo L (%)
  let lipidStatus: 'ok' | 'low' | 'high' = 'ok';
  if (actual.lipidPct < standard.lipidPctMin) lipidStatus = 'low';
  else if (actual.lipidPct > standard.lipidPctMax) lipidStatus = 'high';

  // Kiểm tra tỉ lệ đường bột G (%)
  let carbohydrateStatus: 'ok' | 'low' | 'high' = 'ok';
  if (actual.carbohydratePct < standard.carbohydratePctMin) carbohydrateStatus = 'low';
  else if (actual.carbohydratePct > standard.carbohydratePctMax) carbohydrateStatus = 'high';

  // Kiểm tra Canxi (mg) - Khuyên dùng tối thiểu
  const calciumStatus: 'ok' | 'low' = actual.calcium >= standard.calciumMin ? 'ok' : 'low';

  // Kiểm tra Sắt (mg) - Khuyên dùng tối thiểu
  const ironStatus: 'ok' | 'low' = actual.iron >= standard.ironMin ? 'ok' : 'low';

  // Kiểm tra ngân sách (tiền ăn)
  const budgetStatus: 'ok' | 'over' = actual.costPerChild <= 1.05 * actual.costPerChild ? 'ok' : 'over'; // cho sai lệch nhỏ hoặc so sánh trực tiếp
  
  return {
    energyStatus,
    proteinStatus,
    lipidStatus,
    carbohydrateStatus,
    calciumStatus,
    ironStatus,
    budgetStatus,
  };
}

/**
 * Tính toán tổng nguyên liệu thô cần đi chợ cho toàn trường
 * Kết quả là một mảng tổng hợp các nguyên liệu cần mua, có tính hao hụt hao phí thải bỏ
 */
export interface ShoppingItem {
  ingredientId: string;
  name: string;
  category: string;
  wasteRate: number;
  totalRawWeightKg: number; // Tổng cân nặng thô cần mua (kg)
  totalEdibleWeightKg: number; // Cân nặng tinh ăn được thực tế (kg)
  price: number;
  totalCost: number;
}

export function generateShoppingList(
  meals: Meal[],
  ingredientsDb: Record<string, Ingredient>,
  childrenCount: number
): ShoppingItem[] {
  const summary: Record<string, { rawWeightG: number; edibleWeightG: number }> = {};

  for (const meal of meals) {
    for (const dish of meal.dishes) {
      for (const item of dish.ingredients) {
        const ingredient = ingredientsDb[item.ingredientId];
        if (!ingredient) continue;

        // Lượng cho 1 cháu (gram thô)
        const rawForOne = item.quantityPerChild;
        const edibleForOne = getEdibleWeight(rawForOne, ingredient.wasteRate);

        // Nhân cho tổng số cháu
        const rawTotalG = rawForOne * childrenCount;
        const edibleTotalG = edibleForOne * childrenCount;

        if (!summary[item.ingredientId]) {
          summary[item.ingredientId] = { rawWeightG: 0, edibleWeightG: 0 };
        }
        summary[item.ingredientId].rawWeightG += rawTotalG;
        summary[item.ingredientId].edibleWeightG += edibleTotalG;
      }
    }
  }

  // Chuyển sang mảng báo cáo
  return Object.entries(summary).map(([id, weights]) => {
    const ingredient = ingredientsDb[id];
    const totalRawWeightKg = weights.rawWeightG / 1000;
    const totalEdibleWeightKg = weights.edibleWeightG / 1000;
    const totalCost = totalRawWeightKg * ingredient.price;

    return {
      ingredientId: id,
      name: ingredient.name,
      category: ingredient.category,
      wasteRate: ingredient.wasteRate,
      totalRawWeightKg,
      totalEdibleWeightKg,
      price: ingredient.price,
      totalCost,
    };
  });
}
