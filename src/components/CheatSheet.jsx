import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowDownCircle, CheckCircle, Lightbulb } from 'lucide-react';

// Sửa lại khớp nối: Nhận trực tiếp 'game' và lệnh 'onBack' từ App.jsx truyền xuống
const CheatSheet = ({ game, onBack }) => {
  
  if (!game) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Đang xử lý...</div>;
  }

  // BỘ GIẢM XÓC DỮ LIỆU: Tự động tách các dòng chữ trong Google Sheets (ngăn cách bằng dấu xuống dòng) thành mảng để chạy .map() an toàn, chống crash web.
  const safeArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return typeof data === 'string' ? data.split('\n').filter(item => item.trim() !== '') : [String(data)];
  };

  // Lấy dữ liệu từ game (Có fallback nếu cột trong Sheet bị trống)
  const winCondition = game.winCondition || game.rule1 || "Tiêu diệt đối thủ hoặc đạt điểm cao nhất.";
  const turnSteps = safeArray(game.turnSteps || game.rule2 || "Đang cập nhật hướng dẫn lượt chơi...");
  const scoring = safeArray(game.scoring || "Chưa có thông tin tính điểm.");
  const tricks = safeArray(game.tricks || "Chưa có mẹo nào được ghi nhận.");

  return (
    <div className="bg-[#111216] min-h-screen flex flex-col font-sans">
      
      {/* Thanh điều hướng */}
      <div className="flex items-center p-4 z-10 bg-gray-900/50 backdrop-blur-md sticky top-0">
        <button 
          onClick={onBack} // Đóng CheatSheet an toàn bằng State, không dùng history.back
          className="flex items-center bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-xl text-yellow-500 font-bold transition shadow-lg"
        >
          <ArrowLeft size={20} className="mr-2" />
          Tủ Game
        </button>
        <h1 className="ml-4 text-xl font-extrabold text-white truncate">{game.name}</h1>
      </div>

      {/* Giao diện Thẻ Vuốt Ngang (Snap Scrolling - Mượt hơn Drag Framer trên Mobile) */}
      <div className="flex overflow-x-auto snap-x snap-mandatory flex-grow scrollbar-hide p-4 space-x-4">
        
        {/* Card 1: Cách Thắng */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="snap-center shrink-0 w-[85vw] max-w-sm h-full max-h-[75vh] bg-gray-800 p-6 rounded-3xl shadow-2xl flex flex-col border border-gray-700"
        >
          <h2 className="text-3xl font-bold text-yellow-400 mb-6 flex items-center">
            <span className="text-4xl mr-3">🏆</span> Cách Thắng
          </h2>
          <div className="text-xl text-gray-200 leading-relaxed overflow-y-auto pr-2">
            {winCondition}
          </div>
        </motion.div>

        {/* Card 2: Lượt Của Bạn */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="snap-center shrink-0 w-[85vw] max-w-sm h-full max-h-[75vh] bg-gray-800 p-6 rounded-3xl shadow-2xl flex flex-col border border-gray-700"
        >
          <h2 className="text-3xl font-bold text-blue-400 mb-6 flex items-center">
            <span className="text-4xl mr-3">⚙️</span> Lượt Của Bạn
          </h2>
          <div className="overflow-y-auto pr-2 space-y-4">
            {turnSteps.map((step, index) => (
              <div key={index} className="flex items-start bg-gray-900/50 p-4 rounded-2xl">
                <ArrowDownCircle className="w-6 h-6 text-blue-400 mt-1 shrink-0 mr-3" />
                <p className="text-lg text-gray-200">{step}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card 3: Tính Điểm */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="snap-center shrink-0 w-[85vw] max-w-sm h-full max-h-[75vh] bg-gray-800 p-6 rounded-3xl shadow-2xl flex flex-col border border-gray-700"
        >
          <h2 className="text-3xl font-bold text-green-400 mb-6 flex items-center">
            <span className="text-4xl mr-3">🧮</span> Tính Điểm
          </h2>
          <div className="overflow-y-auto pr-2 space-y-3">
            {scoring.map((score, index) => (
              <div key={index} className="flex items-center bg-gray-900/50 p-4 rounded-2xl">
                <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mr-3" />
                <p className="text-lg text-gray-200">{score}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Card 4: Mẹo & Lưu ý */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="snap-center shrink-0 w-[85vw] max-w-sm h-full max-h-[75vh] bg-gray-800 p-6 rounded-3xl shadow-2xl flex flex-col border border-gray-700"
        >
          <h2 className="text-3xl font-bold text-red-400 mb-6 flex items-center">
            <span className="text-4xl mr-3">😈</span> Mẹo & Lưu ý
          </h2>
          <div className="overflow-y-auto pr-2 space-y-3">
            {tricks.map((trick, index) => (
              <div key={index} className="flex items-start bg-red-950/30 border border-red-900/50 p-4 rounded-2xl">
                <Lightbulb className="w-6 h-6 text-red-400 mt-1 shrink-0 mr-3" />
                <p className="text-lg text-red-200">{trick}</p>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
      
      {/* Hướng dẫn vuốt */}
      <div className="text-center text-gray-500 pb-8 text-sm animate-pulse">
        &larr; Vuốt ngang để xem thêm &rarr;
      </div>
    </div>
  );
};

export default CheatSheet;