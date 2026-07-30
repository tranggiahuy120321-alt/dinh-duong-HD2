/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NutritionStandard } from '../types';

// Tiêu chuẩn dinh dưỡng tại trường theo quy định của Bộ Giáo dục & Đào tạo Việt Nam
// (Dựa trên Thông tư 28/2016/TT-BGDĐT và Thông tư 12/2020/TT-BGDĐT sửa đổi)
export const NUTRITION_STANDARDS: Record<string, NutritionStandard> = {
  nha_tre_12_36: {
    ageGroupId: 'nha_tre_12_36',
    ageGroupName: 'Nhà trẻ (12 - 36 tháng)',
    kcalMin: 500,
    kcalMax: 580,
    proteinPctMin: 13,
    proteinPctMax: 20,
    lipidPctMin: 25,
    lipidPctMax: 35,
    carbohydratePctMin: 52,
    carbohydratePctMax: 60,
    calciumMin: 260, // Nhu cầu khuyến nghị tại trường (~60% nhu cầu cả ngày)
    ironMin: 4.5,
  },
  mau_giao_3_6: {
    ageGroupId: 'mau_giao_3_6',
    ageGroupName: 'Mẫu giáo (3 - 6 tuổi)',
    kcalMin: 615,
    kcalMax: 726,
    proteinPctMin: 13,
    proteinPctMax: 20,
    lipidPctMin: 25,
    lipidPctMax: 35,
    carbohydratePctMin: 52,
    carbohydratePctMax: 60,
    calciumMin: 350, // Nhu cầu khuyến nghị tại trường (~60% nhu cầu cả ngày)
    ironMin: 5.0,
  },
  lop_ghep: {
    ageGroupId: 'lop_ghep',
    ageGroupName: 'Lớp ghép nhiều độ tuổi',
    kcalMin: 550,
    kcalMax: 680,
    proteinPctMin: 13,
    proteinPctMax: 20,
    lipidPctMin: 25,
    lipidPctMax: 35,
    carbohydratePctMin: 52,
    carbohydratePctMax: 60,
    calciumMin: 300,
    ironMin: 4.8,
  }
};
