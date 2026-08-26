import Papa from 'papaparse';
import { GOOGLE_SHEETS_CSV_URL } from '../config';

// Dữ liệu dự phòng (Mock data)
const FALLBACK_GAMES = [
  { id: '1', name: 'Mèo Nổ', time: '<15 phút', players: '2', coverColor: 'bg-red-600', rule1: 'Rút bài đến khi dính mèo nổ.', rule2: 'Dùng thẻ gỡ bom để sống sót.' },
  { id: '2', name: 'Splendor', time: '30-60 phút', players: '3-4', coverColor: 'bg-blue-600', rule1: 'Mua thẻ phát triển.', rule2: 'Thu thập đá quý.' },
  { id: '3', name: 'Ma Sói', time: '45-90 phút', players: 'Nhóm đông', coverColor: 'bg-purple-600', rule1: 'Buổi tối phe sói chọn nạn nhân.', rule2: 'Ban ngày dân làng biện hộ và treo cổ.' }
];

export const fetchGameData = async () => {
  // Nếu chưa có link, lập tức dùng dữ liệu mẫu
  if (!GOOGLE_SHEETS_CSV_URL || GOOGLE_SHEETS_CSV_URL.trim() === '') {
    return FALLBACK_GAMES;
  }

  try {
    const response = await fetch(GOOGLE_SHEETS_CSV_URL);
    if (!response.ok) throw new Error("Lỗi mạng");
    const csvText = await response.text();
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            resolve(results.data);
          } else {
            resolve(FALLBACK_GAMES);
          }
        },
        error: () => resolve(FALLBACK_GAMES)
      });
    });
  } catch (error) {
    console.error("Dùng dữ liệu dự phòng vì lỗi fetch:", error);
    return FALLBACK_GAMES;
  }
};