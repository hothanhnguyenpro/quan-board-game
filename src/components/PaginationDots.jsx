import React from 'react';

const PaginationDots = ({ total, currentIndex }) => {
  return (
    <div className="flex justify-center items-center space-x-2 py-4">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`h-2 rounded-full transition-all duration-300 ${
            index === currentIndex 
              ? 'w-8 bg-yellow-400 shadow-[0_0_8px_rgba(253,224,71,0.6)]' 
              : 'w-2 bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
};

export default PaginationDots;