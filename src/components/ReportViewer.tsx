/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { FileSpreadsheet, Printer, TrendingUp, DollarSign, Users, Sparkles, FileText, Eye, Download, ExternalLink, X } from 'lucide-react';
import { Meal, Ingredient, AgeGroup } from '../types';
import { calculateDailyRation, checkAgainstStandard, generateShoppingList } from '../utils/calculator';
import { NUTRITION_STANDARDS } from '../data/standards';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';

// Khởi tạo các biến cache font chữ để tối ưu tốc độ kết xuất sau lần đầu tải
let cachedRegular: string | null = null;
let cachedBold: string | null = null;

async function getFonts(): Promise<{ regular: string; bold: string }> {
  if (cachedRegular && cachedBold) {
    return { regular: cachedRegular, bold: cachedBold };
  }
  
  // Tải font chữ tiếng Việt Times New Roman (Tinos) hỗ trợ Unicode đầy đủ từ CDN jsdelivr
  const [resReg, resBold] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Regular.ttf'),
    fetch('https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tinos/Tinos-Bold.ttf')
  ]);
  
  if (!resReg.ok || !resBold.ok) {
    throw new Error('Không thể tải font chữ từ máy chủ CDN. Vui lòng kiểm tra lại kết nối mạng.');
  }
  
  const [bufReg, bufBold] = await Promise.all([
    resReg.arrayBuffer(),
    resBold.arrayBuffer()
  ]);
  
  const toBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };
  
  cachedRegular = toBase64(bufReg);
  cachedBold = toBase64(bufBold);
  
  return { regular: cachedRegular, bold: cachedBold };
}

interface ReportViewerProps {
  meals: Meal[];
  ingredientsDb: Record<string, Ingredient>;
  childrenCount: number;
  budgetPerChild: number;
  ageGroup: AgeGroup;
  dateString: string;
}

export default function ReportViewer({
  meals,
  ingredientsDb,
  childrenCount,
  budgetPerChild,
  ageGroup,
  dateString,
}: ReportViewerProps) {
  
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [showMobilePdfModal, setShowMobilePdfModal] = useState(false);

  // Tính toán dữ liệu khẩu phần
  const nutrition = useMemo(() => {
    return calculateDailyRation(meals, ingredientsDb, childrenCount, budgetPerChild);
  }, [meals, ingredientsDb, childrenCount, budgetPerChild]);

  // Kiểm định chất lượng so với tiêu chuẩn
  const standard = NUTRITION_STANDARDS[ageGroup];
  const checks = useMemo(() => {
    return checkAgainstStandard(nutrition, standard);
  }, [nutrition, standard]);

  // Danh sách đi chợ (hao hụt thải bỏ đã tính toán trong hàm này)
  const shoppingList = useMemo(() => {
    return generateShoppingList(meals, ingredientsDb, childrenCount);
  }, [meals, ingredientsDb, childrenCount]);

  // Tính tổng tiền đi chợ thực tế
  const totalShoppingCost = useMemo(() => {
    return shoppingList.reduce((sum, item) => sum + item.totalCost, 0);
  }, [shoppingList]);

  const maxBudget = childrenCount * budgetPerChild;
  const budgetUtilization = maxBudget > 0 ? (totalShoppingCost / maxBudget) * 100 : 0;

  // Xuất file CSV phiếu đi chợ
  const handleExportShoppingCSV = () => {
    let csvContent = '\uFEFF'; // BOM hỗ trợ hiển thị Tiếng Việt trong Excel
    csvContent += `BÁO CÁO PHIẾU ĐI CHỢ - DỰ ÁN DINH DƯỠNG LỚP MẪU GIÁO HƯỚNG DƯƠNG 2\r\n`;
    csvContent += `Ngày áp dụng: ${dateString}\r\n`;
    csvContent += `Độ tuổi trẻ: ${standard.ageGroupName}\r\n`;
    csvContent += `Sĩ số học sinh: ${childrenCount} trẻ\r\n`;
    csvContent += `Định mức tiền ăn: ${budgetPerChild.toLocaleString()} VNĐ/trẻ/ngày\r\n`;
    csvContent += `Tổng ngân sách chi phép: ${maxBudget.toLocaleString()} VNĐ\r\n`;
    csvContent += `Tổng chi thực tế: ${totalShoppingCost.toLocaleString()} VNĐ\r\n\r\n`;

    csvContent += `STT,Tên nguyên liệu,Nhóm thực phẩm,Tỉ lệ thải bỏ (%),Khối lượng thô cần mua (kg),Khối lượng tinh ăn được (kg),Đơn giá học đường (VNĐ/kg),Tổng tiền (VNĐ)\r\n`;

    shoppingList.forEach((item, idx) => {
      const catLabel = getCategoryLabel(item.category as any);
      csvContent += `${idx + 1},"${item.name}",${catLabel},${item.wasteRate}%,${item.totalRawWeightKg.toFixed(3)},${item.totalEdibleWeightKg.toFixed(3)},${item.price},${Math.round(item.totalCost)}\r\n`;
    });

    csvContent += `\r\n,,,,,TỔNG CHI PHÍ THỰC TẾ TRONG NGÀY,,${Math.round(totalShoppingCost)}\r\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Phieu_Di_Cho_${dateString}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trích xuất nhãn danh mục tiếng việt
  function getCategoryLabel(cat: string) {
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
  }

  // Khởi chạy chế độ in ấn gốc của trình duyệt hoặc hiển thị tùy chọn in/PDF cho thiết bị di động
  const handlePrint = () => {
    // Nhận diện thiết bị di động
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Trên thiết bị di động, in trực tiếp qua trình duyệt thường bị chặn hoặc không khả dụng.
      // Giải pháp tối ưu nhất là kích hoạt xuất PDF, từ đó hiển thị Modal tùy chọn mở Xem trước & Lưu PDF
      // hỗ trợ tải về hoặc in ấn nguyên bản cực kỳ tiện lợi.
      handleExportPDF(false);
    } else {
      // Đối với máy tính để bàn, gọi trực tiếp tính năng in của hệ thống
      window.focus();
      window.print();
    }
  };

  // Xuất báo cáo PDF chuyên nghiệp với jsPDF và jsPDF-AutoTable
  const handleExportPDF = async (forceDirectDownload = false) => {
    try {
      setExportingPdf(true);
      setPdfError(null);

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Tải và cấu hình font chữ Unicode hỗ trợ đầy đủ tiếng Việt có dấu (Times New Roman / Tinos)
      try {
        const fonts = await getFonts();
        doc.addFileToVFS('Times-New-Roman.ttf', fonts.regular);
        doc.addFont('Times-New-Roman.ttf', 'Times New Roman', 'normal');
        doc.addFileToVFS('Times-New-Roman-Bold.ttf', fonts.bold);
        doc.addFont('Times-New-Roman-Bold.ttf', 'Times New Roman', 'bold');
        doc.setFont('Times New Roman', 'normal');
      } catch (fontErr) {
        console.warn('Không tải được font Unicode từ CDN, chuyển sang font mặc định:', fontErr);
      }

      // 1. Tiêu đề trường học và Quốc hiệu tiêu ngữ ở đầu trang
      doc.setFont('Times New Roman', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(45, 43, 40); // natural-dark
      doc.text('LỚP MẪU GIÁO HƯỚNG DƯƠNG 2', 15, 15);
      
      doc.setFont('Times New Roman', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(138, 132, 121); // natural-muted
      doc.text('Bộ phận cấp dưỡng:', 15, 20);
      
      doc.setFont('Times New Roman', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(45, 43, 40); // natural-dark
      doc.text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 195, 15, { align: 'right' });
      
      doc.setFont('Times New Roman', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(45, 43, 40); // natural-dark
      doc.text('Độc lập - Tự do - Hạnh phúc', 195, 20, { align: 'right' });
      doc.text('-------------------', 195, 23, { align: 'right' });
      
      // Tiêu đề báo cáo chính
      doc.setFont('Times New Roman', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(91, 140, 90); // natural-primary
      doc.text('BÁO CÁO DINH DƯỠNG & PHIẾU ĐI CHỢ HẰNG NGÀY', 105, 34, { align: 'center' });
      
      doc.setFont('Times New Roman', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(45, 43, 40); // natural-dark
      doc.text(`Ngày áp dụng: ${dateString}`, 105, 40, { align: 'center' });

      // 2. Bảng thông tin chung hành chính
      autoTable(doc, {
        startY: 46,
        theme: 'plain',
        styles: {
          font: 'Times New Roman',
          fontSize: 9,
          cellPadding: 1.5,
          textColor: [45, 43, 40],
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'bold', textColor: [138, 132, 121] },
          1: { cellWidth: 55 },
          2: { cellWidth: 40, fontStyle: 'bold', textColor: [138, 132, 121] },
          3: { cellWidth: 50 },
        },
        body: [
          ['Sĩ số học sinh:', `${childrenCount} trẻ`, 'Định mức ăn:', `${budgetPerChild.toLocaleString()}đ / trẻ / ngày`],
          ['Độ tuổi áp dụng:', standard.ageGroupName, 'Tổng ngân sách chi:', `${maxBudget.toLocaleString()} VNĐ`],
          ['Tổng chi thực tế:', `${Math.round(totalShoppingCost).toLocaleString()} VNĐ`, 'Hiệu suất ngân sách:', `${budgetUtilization.toFixed(1)}%`],
        ]
      });

      let currentY = (doc as any).lastAutoTable.finalY + 8;

      // 3. Phần I: Thực đơn dinh dưỡng & Định lượng thực phẩm
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('Times New Roman', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(91, 140, 90); // natural-primary
      doc.text('I. Thực đơn dinh dưỡng & Định lượng thực phẩm', 15, currentY);
      currentY += 4;

      const menuRows: any[] = [];
      meals.forEach((meal) => {
        meal.dishes.forEach((dish, dIdx) => {
          dish.ingredients.forEach((ing, iIdx) => {
            const dbIng = ingredientsDb[ing.ingredientId];
            const ingName = dbIng ? dbIng.name : 'Chưa rõ';
            const totalWeightG = ing.quantityPerChild * childrenCount;
            const totalWeightStr = totalWeightG >= 1000 
              ? `${(totalWeightG / 1000).toFixed(3)} kg` 
              : `${totalWeightG.toFixed(0)} g`;
            
            menuRows.push([
              dIdx === 0 && iIdx === 0 ? meal.name : '',
              iIdx === 0 ? dish.name : '',
              ingName,
              `${ing.quantityPerChild} g`,
              totalWeightStr
            ]);
          });
        });
      });

      autoTable(doc, {
        startY: currentY,
        head: [['Bữa ăn', 'Món ăn', 'Thành phần nguyên liệu', 'KL tinh (g/trẻ)', 'KL cả lớp']],
        body: menuRows,
        theme: 'grid',
        styles: {
          font: 'Times New Roman',
          fontSize: 8.5,
          cellPadding: 2,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [91, 140, 90], // natural-primary
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 25, fontStyle: 'bold' },
          1: { cellWidth: 40, fontStyle: 'bold' },
          2: { cellWidth: 55 },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 30, halign: 'right' },
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // 4. Phần II: Sổ tính khẩu phần ăn chi tiết
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('Times New Roman', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(91, 140, 90); // natural-primary
      doc.text('II. Sổ tính khẩu phần ăn chi tiết', 15, currentY);
      currentY += 4;

      const nutritionRows = [
        [
          '1. Năng lượng (Kcal/trẻ/ngày)',
          `${standard.kcalMin} - ${standard.kcalMax} Kcal`,
          `${Math.round(nutrition.energy)} Kcal`,
          '—',
          checks.energyStatus === 'ok' ? 'ĐẠT CHUẨN' : checks.energyStatus === 'low' ? 'THIẾU HỤT' : 'VƯỢT NGƯỠNG'
        ],
        [
          `2. Chất Đạm (Protein)\n   (Trọng lượng: ${nutrition.protein.toFixed(1)}g / trẻ)`,
          `${standard.proteinPctMin}% - ${standard.proteinPctMax}%`,
          `${nutrition.proteinPct.toFixed(1)}%`,
          `${Math.round(nutrition.proteinKcal)} Kcal`,
          checks.proteinStatus === 'ok' ? 'ĐẠT CHUẨN' : checks.proteinStatus === 'low' ? 'QUÁ THẤP' : 'QUÁ CAO'
        ],
        [
          `3. Chất Béo (Lipid)\n   (Trọng lượng: ${nutrition.lipid.toFixed(1)}g / trẻ)`,
          `${standard.lipidPctMin}% - ${standard.lipidPctMax}%`,
          `${nutrition.lipidPct.toFixed(1)}%`,
          `${Math.round(nutrition.lipidKcal)} Kcal`,
          checks.lipidStatus === 'ok' ? 'ĐẠT CHUẨN' : checks.lipidStatus === 'low' ? 'QUÁ THẤP' : 'QUÁ CAO'
        ],
        [
          `4. Đường bột (Carbohydrate)\n   (Trọng lượng: ${nutrition.carbohydrate.toFixed(1)}g / trẻ)`,
          `${standard.carbohydratePctMin}% - ${standard.carbohydratePctMax}%`,
          `${nutrition.carbohydratePct.toFixed(1)}%`,
          `${Math.round(nutrition.carbohydrateKcal)} Kcal`,
          checks.carbohydrateStatus === 'ok' ? 'ĐẠT CHUẨN' : checks.carbohydrateStatus === 'low' ? 'QUÁ THẤP' : 'QUÁ CAO'
        ],
        [
          '5. Canxi học đường (mg/trẻ)',
          `≥ ${standard.calciumMin} mg`,
          `${Math.round(nutrition.calcium)} mg`,
          '—',
          checks.calciumStatus === 'ok' ? 'ĐẠT TIÊU CHUẨN' : 'HƠI THẤP'
        ],
        [
          '6. Sắt học đường (mg/trẻ)',
          `≥ ${standard.ironMin} mg`,
          `${nutrition.iron.toFixed(2)} mg`,
          '—',
          checks.ironStatus === 'ok' ? 'ĐẠT TIÊU CHUẨN' : 'HƠI THẤP'
        ]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [['Chất dinh dưỡng', 'Tiêu chuẩn mầm non', 'Thực tế đạt được', 'Tỷ lệ đóng góp NL', 'Đối chiếu']],
        body: nutritionRows,
        theme: 'grid',
        styles: {
          font: 'Times New Roman',
          fontSize: 8.5,
          cellPadding: 2.5,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [91, 140, 90], // natural-primary
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold' },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 30, halign: 'center' },
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // 5. Phần III: Phiếu đi chợ thực phẩm tổng hợp
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('Times New Roman', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(91, 140, 90); // natural-primary
      doc.text('III. Phiếu đi chợ thực phẩm tổng hợp (Hao hụt đã tính toán)', 15, currentY);
      currentY += 4;

      const marketRows = shoppingList.map((item, idx) => [
        (idx + 1).toString(),
        item.name,
        getCategoryLabel(item.category),
        `${item.wasteRate}%`,
        `${item.totalRawWeightKg.toFixed(3)} kg`,
        `${item.totalEdibleWeightKg.toFixed(3)} kg`,
        `${item.price.toLocaleString()}đ`,
        `${Math.round(item.totalCost).toLocaleString()}đ`
      ]);

      const marketFoot: any[] = [
        [
          { content: 'CỘNG TỔNG CHI PHÍ THỰC TẾ HÀNG NGÀY TRONG TRƯỜNG', colSpan: 6, styles: { halign: 'left', fontStyle: 'bold' } },
          { content: 'Đạt chỉ tiêu', styles: { halign: 'right', fontStyle: 'bold', textColor: [91, 140, 90] } },
          { content: `${Math.round(totalShoppingCost).toLocaleString()} VNĐ`, styles: { halign: 'right', fontStyle: 'bold', textColor: [91, 140, 90] } }
        ]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [['STT', 'Tên thực phẩm', 'Nhóm thực phẩm', 'Hao hụt', 'KL thô (Mua)', 'KL tinh (Ăn)', 'Giá/kg', 'Thành tiền']],
        body: marketRows,
        foot: marketFoot,
        theme: 'grid',
        styles: {
          font: 'Times New Roman',
          fontSize: 8,
          cellPadding: 2,
          valign: 'middle',
        },
        headStyles: {
          fillColor: [91, 140, 90], // natural-primary
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        footStyles: {
          fillColor: [249, 247, 242], // natural-light
          textColor: [45, 43, 40],
          fontSize: 8.5,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 40, fontStyle: 'bold' },
          2: { cellWidth: 30 },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 20, halign: 'right' },
        }
      });

      // 6. Ban giám hiệu & phê duyệt ký nhận
      let finalY = (doc as any).lastAutoTable.finalY || currentY;
      if (finalY > 230) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFont('Times New Roman', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(138, 132, 121); // natural-muted
      doc.text('NGƯỜI LẬP THỰC ĐƠN', 15 + 35, finalY + 15, { align: 'center' });
      doc.text('CHỦ NHÓM DUYỆT', 15 + 145, finalY + 15, { align: 'center' });
      
      doc.setFont('Times New Roman', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(45, 43, 40); // natural-dark
      doc.text('Cô cấp dưỡng', 15 + 35, finalY + 28, { align: 'center' });
      doc.text('Chủ nhóm', 15 + 145, finalY + 28, { align: 'center' });
      
      doc.setFont('Times New Roman', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(138, 132, 121); // natural-muted
      doc.text('(Ký, ghi rõ họ tên)', 15 + 35, finalY + 33, { align: 'center' });
      doc.text('(Ký tên và đóng dấu)', 15 + 145, finalY + 33, { align: 'center' });

      // 7. Đánh số trang & Thêm chân trang chuyên nghiệp
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('Times New Roman', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(138, 132, 121); // natural-muted
        doc.text(`Trang ${i} / ${pageCount}`, 195, 287, { align: 'right' });
        doc.text('Lớp mẫu giáo Hướng Dương 2 - Phần mềm Quản lý Dinh dưỡng', 15, 287);
      }

      // Tạo Blob và URL đối tượng
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);

      // Nhận diện thiết bị di động
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile && !forceDirectDownload) {
        setShowMobilePdfModal(true);
      } else {
        // Tải xuống trực tiếp bằng thẻ a hoặc doc.save để đảm bảo tương thích tối đa
        try {
          doc.save(`Bao_Cao_Dinh_Duong_${dateString}.pdf`);
        } catch (saveErr) {
          // Phương án dự phòng bằng URL Blob
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `Bao_Cao_Dinh_Duong_${dateString}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      setPdfError(error?.message || 'Có lỗi xảy ra trong quá trình khởi tạo và xuất PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white rounded-2xl border border-natural-border p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-natural-light rounded-xl text-natural-text">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-natural-muted text-[10px] font-bold uppercase tracking-wider">Tổng số trẻ ăn</span>
            <p className="text-lg font-extrabold text-natural-dark">{childrenCount} cháu</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-natural-border p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-natural-primary/10 rounded-xl text-natural-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-natural-muted text-[10px] font-bold uppercase tracking-wider">Năng lượng thực tế</span>
            <p className="text-lg font-extrabold text-natural-dark">{Math.round(nutrition.energy)} Kcal</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-natural-border p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-natural-accent-green/10 rounded-xl text-natural-primary">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-natural-muted text-[10px] font-bold uppercase tracking-wider">Chi phí / cháu</span>
            <p className="text-lg font-extrabold text-natural-dark">
              {Math.round(nutrition.costPerChild).toLocaleString()}đ
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-natural-border p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-natural-accent-orange/10 rounded-xl text-natural-accent-orange">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-natural-muted text-[10px] font-bold uppercase tracking-wider">Ngân sách sử dụng</span>
            <p className={`text-lg font-extrabold ${totalShoppingCost > maxBudget ? 'text-natural-accent-orange' : 'text-natural-dark'}`}>
              {budgetUtilization.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons (Print / Export) */}
      <div className="bg-white rounded-2xl border border-natural-border p-6 shadow-sm flex flex-col gap-4 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-base font-bold text-natural-dark">Kết xuất hồ sơ dinh dưỡng</h2>
            <p className="text-xs text-natural-muted">Tải file PDF chuyên nghiệp ký tên đóng dấu, in trực tiếp từ trình duyệt, hoặc xuất Excel.</p>
          </div>
          
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto justify-end">
            <button
              onClick={handleExportShoppingCSV}
              disabled={shoppingList.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 border border-natural-border bg-white hover:bg-natural-light text-natural-text rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4 text-natural-primary" />
              <span>Xuất file Excel (.CSV)</span>
            </button>
            
            <button
              onClick={handleExportPDF}
              disabled={shoppingList.length === 0 || exportingPdf}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-natural-primary hover:bg-natural-primary-hover text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingPdf ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{exportingPdf ? 'Đang xuất PDF...' : 'Xuất file PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={shoppingList.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 border border-natural-primary/50 text-natural-primary bg-white hover:bg-natural-light rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Xem & In trực tiếp</span>
            </button>
          </div>
        </div>

        {pdfError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-xs flex justify-between items-center animate-fade-in">
            <span>{pdfError}</span>
            <button onClick={() => setPdfError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer">X</button>
          </div>
        )}
      </div>

      {/* Main Document Layout (This layout is optimized with media-print for paper output) */}
      <div id="printable-report" className="bg-white rounded-2xl border border-natural-border shadow-sm p-8 space-y-8 print:border-0 print:shadow-none print:p-0">
        
        {/* Report Header for Paper */}
        <div className="flex justify-between items-start border-b-2 border-natural-dark pb-5">
          <div className="space-y-1">
            <h1 className="text-base font-extrabold text-natural-dark uppercase tracking-wide">Lớp mẫu giáo Hướng Dương 2</h1>
            <p className="text-xs text-natural-muted print:text-natural-muted">Bộ phận cấp dưỡng:</p>
          </div>
          <div className="text-right space-y-1">
            <h2 className="text-base font-extrabold text-natural-primary uppercase">Báo cáo Dinh dưỡng Ngày</h2>
            <p className="text-xs text-natural-text font-bold bg-natural-light px-2 py-1 rounded border border-natural-border inline-block">
              {dateString}
            </p>
          </div>
        </div>

        {/* 1. SỔ TÍNH KHẨU PHẦN ĂN (Nutrition Breakdown Summary) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-natural-primary rounded-full"></span>
            <h3 className="text-sm font-bold text-natural-dark uppercase tracking-wide">I. Sổ tính khẩu phần ăn chi tiết</h3>
          </div>
          
          <div className="border border-natural-border rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-natural-panel text-natural-dark font-bold border-b border-natural-border text-[10px] uppercase">
                  <th className="px-4 py-3">Chất dinh dưỡng</th>
                  <th className="px-4 py-3 text-center">Tiêu chuẩn mầm non</th>
                  <th className="px-4 py-3 text-center">Đạt được thực tế</th>
                  <th className="px-4 py-3 text-center">Tỷ lệ đóng góp năng lượng</th>
                  <th className="px-4 py-3 text-center">Kết quả đối chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-natural-border/60 font-bold text-natural-text">
                {/* Kcal */}
                <tr>
                  <td className="px-4 py-3.5 font-bold text-natural-dark">1. Năng lượng (Kcal / trẻ / ngày)</td>
                  <td className="px-4 py-3.5 text-center text-natural-muted">{standard.kcalMin} - {standard.kcalMax} Kcal</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-natural-dark">{Math.round(nutrition.energy)} Kcal</td>
                  <td className="px-4 py-3.5 text-center text-natural-muted/50">—</td>
                  <td className="px-4 py-3.5 text-center">
                    {checks.energyStatus === 'ok' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-green/10 text-natural-primary rounded-full font-bold text-[10px] border border-natural-accent-green/20">ĐẠT CHUẨN</span>
                    ) : checks.energyStatus === 'low' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-orange/10 text-natural-accent-orange rounded-full font-bold text-[10px] border border-natural-accent-orange/20">THIẾU HỤT</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-natural-light text-natural-dark rounded-full font-bold text-[10px] border border-natural-border">VƯỢT NGƯỠNG</span>
                    )}
                  </td>
                </tr>

                {/* Protein P% */}
                <tr>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-natural-dark">2. Chất Đạm (Protein)</div>
                    <div className="text-[10px] text-natural-muted font-medium">Trọng lượng: {nutrition.protein.toFixed(1)}g / trẻ</div>
                  </td>
                  <td className="px-4 py-3.5 text-center text-natural-muted">{standard.proteinPctMin}% - {standard.proteinPctMax}%</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-natural-dark">{nutrition.proteinPct.toFixed(1)}%</td>
                  <td className="px-4 py-3.5 text-center text-natural-text">{Math.round(nutrition.proteinKcal)} Kcal</td>
                  <td className="px-4 py-3.5 text-center">
                    {checks.proteinStatus === 'ok' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-green/10 text-natural-primary rounded-full font-bold text-[10px] border border-natural-accent-green/20">ĐẠT CHUẨN</span>
                    ) : checks.proteinStatus === 'low' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-orange/10 text-natural-accent-orange rounded-full font-bold text-[10px] border border-natural-accent-orange/20">QUÁ THẤP</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-natural-light text-natural-dark rounded-full font-bold text-[10px] border border-natural-border">QUÁ CAO</span>
                    )}
                  </td>
                </tr>

                {/* Lipid L% */}
                <tr>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-natural-dark">3. Chất Béo (Lipid)</div>
                    <div className="text-[10px] text-natural-muted font-medium">Trọng lượng: {nutrition.lipid.toFixed(1)}g / trẻ</div>
                  </td>
                  <td className="px-4 py-3.5 text-center text-natural-muted">{standard.lipidPctMin}% - {standard.lipidPctMax}%</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-natural-dark">{nutrition.lipidPct.toFixed(1)}%</td>
                  <td className="px-4 py-3.5 text-center text-natural-text">{Math.round(nutrition.lipidKcal)} Kcal</td>
                  <td className="px-4 py-3.5 text-center">
                    {checks.lipidStatus === 'ok' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-green/10 text-natural-primary rounded-full font-bold text-[10px] border border-natural-accent-green/20">ĐẠT CHUẨN</span>
                    ) : checks.lipidStatus === 'low' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-orange/10 text-natural-accent-orange rounded-full font-bold text-[10px] border border-natural-accent-orange/20">QUÁ THẤP</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-natural-light text-natural-dark rounded-full font-bold text-[10px] border border-natural-border">QUÁ CAO</span>
                    )}
                  </td>
                </tr>

                {/* Carb G% */}
                <tr>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-natural-dark">4. Đường bột (Carbohydrate / Glucid)</div>
                    <div className="text-[10px] text-natural-muted font-medium">Trọng lượng: {nutrition.carbohydrate.toFixed(1)}g / trẻ</div>
                  </td>
                  <td className="px-4 py-3.5 text-center text-natural-muted">{standard.carbohydratePctMin}% - {standard.carbohydratePctMax}%</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-natural-dark">{nutrition.carbohydratePct.toFixed(1)}%</td>
                  <td className="px-4 py-3.5 text-center text-natural-text">{Math.round(nutrition.carbohydrateKcal)} Kcal</td>
                  <td className="px-4 py-3.5 text-center">
                    {checks.carbohydrateStatus === 'ok' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-green/10 text-natural-primary rounded-full font-bold text-[10px] border border-natural-accent-green/20">ĐẠT CHUẨN</span>
                    ) : checks.carbohydrateStatus === 'low' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-orange/10 text-natural-accent-orange rounded-full font-bold text-[10px] border border-natural-accent-orange/20">QUÁ THẤP</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-natural-light text-natural-dark rounded-full font-bold text-[10px] border border-natural-border">QUÁ CAO</span>
                    )}
                  </td>
                </tr>

                {/* Calcium */}
                <tr>
                  <td className="px-4 py-3.5 font-bold text-natural-dark">5. Canxi học đường (mg / trẻ)</td>
                  <td className="px-4 py-3.5 text-center text-natural-muted">≥ {standard.calciumMin} mg</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-natural-dark">{Math.round(nutrition.calcium)} mg</td>
                  <td className="px-4 py-3.5 text-center text-natural-muted/50">—</td>
                  <td className="px-4 py-3.5 text-center">
                    {checks.calciumStatus === 'ok' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-green/10 text-natural-primary rounded-full font-bold text-[10px] border border-natural-accent-green/20">ĐẠT TIÊU CHUẨN</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-natural-accent-orange/10 text-natural-accent-orange rounded-full font-bold text-[10px] border border-natural-accent-orange/20">HƠI THẤP</span>
                    )}
                  </td>
                </tr>

                {/* Iron */}
                <tr>
                  <td className="px-4 py-3.5 font-bold text-natural-dark">6. Sắt học đường (mg / trẻ)</td>
                  <td className="px-4 py-3.5 text-center text-natural-muted">≥ {standard.ironMin} mg</td>
                  <td className="px-4 py-3.5 text-center font-extrabold text-natural-dark">{nutrition.iron.toFixed(2)} mg</td>
                  <td className="px-4 py-3.5 text-center text-natural-muted/50">—</td>
                  <td className="px-4 py-3.5 text-center">
                    {checks.ironStatus === 'ok' ? (
                      <span className="px-2.5 py-1 bg-natural-accent-green/10 text-natural-primary rounded-full font-bold text-[10px] border border-natural-accent-green/20">ĐẠT TIÊU CHUẨN</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-natural-accent-orange/10 text-natural-accent-orange rounded-full font-bold text-[10px] border border-natural-accent-orange/20">HƠI THẤP</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. PHIẾU ĐI CHỢ TỔNG HỢP (Purchase / Market Shopping List) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-natural-primary rounded-full"></span>
            <h3 className="text-sm font-bold text-natural-dark uppercase tracking-wide">II. Phiếu đi chợ thực phẩm (Hao hụt thải bỏ đã được tính toán)</h3>
          </div>
          <p className="text-xs text-natural-muted mt-[-10px] italic">
            * Khối lượng thô cần mua = [Số lượng ăn được / (1 - Tỉ lệ thải bỏ / 100)] * Số lượng trẻ. Đảm bảo mua đúng cân thô ngoài thị trường để khi chế biến trừ cọng lá/xương vẫn đủ khẩu phần trẻ ăn.
          </p>

          <div className="border border-natural-border rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-natural-panel text-natural-dark font-bold border-b border-natural-border text-[10px] uppercase">
                  <th className="px-4 py-3 text-center">STT</th>
                  <th className="px-4 py-3">Tên thực phẩm cần mua</th>
                  <th className="px-4 py-3">Nhóm</th>
                  <th className="px-4 py-3 text-center">Hao hụt thải bỏ</th>
                  <th className="px-4 py-3 text-right">Khối lượng thô (Mua)</th>
                  <th className="px-4 py-3 text-right">Khối lượng tinh (Ăn)</th>
                  <th className="px-4 py-3 text-right">Giá thị trường / kg</th>
                  <th className="px-4 py-3 text-right">Tổng thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-natural-border/60 font-bold text-natural-text">
                {shoppingList.map((item, index) => (
                  <tr key={item.ingredientId} className="hover:bg-natural-light/20">
                    <td className="px-4 py-3 text-center font-bold text-natural-muted">{index + 1}</td>
                    <td className="px-4 py-3 font-extrabold text-natural-dark">{item.name}</td>
                    <td className="px-4 py-3 text-natural-text">{getCategoryLabel(item.category)}</td>
                    <td className="px-4 py-3 text-center text-natural-muted">{item.wasteRate}%</td>
                    <td className="px-4 py-3 text-right text-natural-dark font-extrabold bg-natural-light/30">{item.totalRawWeightKg.toFixed(3)} kg</td>
                    <td className="px-4 py-3 text-right text-natural-muted">{item.totalEdibleWeightKg.toFixed(3)} kg</td>
                    <td className="px-4 py-3 text-right text-natural-text">{(item.price).toLocaleString()}đ</td>
                    <td className="px-4 py-3 text-right text-natural-dark font-extrabold">{(Math.round(item.totalCost)).toLocaleString()}đ</td>
                  </tr>
                ))}
                
                {/* Grand total summary row */}
                <tr className="bg-natural-primary/10 text-natural-dark font-extrabold border-t border-natural-border">
                  <td colSpan={6} className="px-4 py-4 text-left">
                    <div className="flex flex-col">
                      <span className="font-bold text-natural-dark">CỘNG TỔNG CHI PHÍ THỰC TẾ HÀNG NGÀY TRONG TRƯỜNG</span>
                      <span className="text-[10px] text-natural-muted font-normal italic">
                        (So sánh với tổng định mức chi phép: {maxBudget.toLocaleString()}đ của lớp học {childrenCount} trẻ)
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-xs text-natural-primary font-bold">Đạt chỉ tiêu</td>
                  <td className="px-4 py-4 text-right text-sm text-natural-primary font-extrabold">
                    {(Math.round(totalShoppingCost)).toLocaleString()} VNĐ
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. PHÊ DUYỆT & KÝ TÊN (School Approvals) */}
        <div className="grid grid-cols-2 gap-6 pt-10 text-center text-xs text-natural-text print:pt-16">
          <div className="space-y-12">
            <p className="font-bold uppercase tracking-wider text-natural-muted">Người lập thực đơn</p>
            <div>
              <p className="font-bold text-natural-dark text-sm">Cô cấp dưỡng</p>
              <p className="text-[10px] text-natural-muted font-medium">(Ký, ghi rõ họ tên)</p>
            </div>
          </div>

          <div className="space-y-12">
            <p className="font-bold uppercase tracking-wider text-natural-muted">Chủ nhóm duyệt</p>
            <div>
              <p className="font-bold text-natural-dark text-sm">Chủ nhóm</p>
              <p className="text-[10px] text-natural-muted font-medium">(Ký tên và đóng dấu)</p>
            </div>
          </div>
        </div>

      </div>

      {/* Mobile PDF Download Options Modal */}
      <AnimatePresence>
        {showMobilePdfModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobilePdfModal(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', duration: 0.4 }}
                className="relative transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all w-full max-w-sm border border-natural-border z-10"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowMobilePdfModal(false)}
                  className="absolute right-4 top-4 text-natural-muted hover:text-natural-dark p-1 rounded-lg hover:bg-natural-light/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 border-b border-natural-border/60 pb-4 mb-4">
                  <div className="p-2.5 bg-natural-primary/10 rounded-xl text-natural-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-natural-dark">Tùy chọn tải PDF trên Di động</h3>
                    <p className="text-[10px] text-natural-muted">Tối ưu hóa khả năng hiển thị & tải xuống</p>
                  </div>
                </div>

                {/* Body / Description */}
                <div className="space-y-4">
                  <p className="text-xs text-natural-text leading-relaxed">
                    Trình duyệt trên thiết bị di động (đặc biệt là Zalo, Facebook, Messenger hoặc Safari iOS) đôi khi chặn tải tệp trực tiếp trong khung bảo mật. Vui lòng chọn phương thức phù hợp nhất:
                  </p>

                  <div className="grid grid-cols-1 gap-3">
                    {/* Option 1: Preview and Open in New Tab (Recommended for iOS/Mobile) */}
                    <button
                      onClick={() => {
                        if (pdfBlobUrl) {
                          window.open(pdfBlobUrl, '_blank');
                        }
                        setShowMobilePdfModal(false);
                      }}
                      className="flex items-center gap-3 w-full p-3 border border-natural-primary/30 hover:border-natural-primary bg-natural-primary/5 hover:bg-natural-primary/10 text-natural-primary rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <div className="p-2 bg-white rounded-lg shadow-2xs group-hover:scale-105 transition-transform text-natural-primary">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold flex items-center gap-1">
                          <span>Mở xem trước & Lưu</span>
                          <ExternalLink className="w-3.5 h-3.5 text-natural-primary" />
                        </p>
                        <p className="text-[10px] text-natural-muted/90 mt-0.5">Khuyên dùng cho iPhone, Safari, Zalo, Facebook. Bạn có thể xem và chia sẻ ngay.</p>
                      </div>
                    </button>

                    {/* Option 2: Direct Download Force */}
                    <button
                      onClick={() => {
                        setShowMobilePdfModal(false);
                        handleExportPDF(true);
                      }}
                      className="flex items-center gap-3 w-full p-3 border border-natural-border hover:border-natural-muted bg-white hover:bg-natural-light/40 text-natural-dark rounded-xl text-left transition-all group cursor-pointer"
                    >
                      <div className="p-2 bg-natural-light rounded-lg shadow-2xs group-hover:scale-105 transition-transform text-natural-dark">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold">Tải xuống tệp trực tiếp</p>
                        <p className="text-[10px] text-natural-muted mt-0.5">Tải tệp tin về bộ nhớ máy (Tương thích tốt trên Android Chrome).</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-3 border-t border-natural-border/60 flex justify-end">
                  <button
                    onClick={() => setShowMobilePdfModal(false)}
                    className="px-4 py-2 bg-natural-light hover:bg-natural-border/40 text-natural-dark font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
