import React, { useMemo, useState } from 'react';
import GameCard from './GameCard.jsx';
import FilterSheet from './FilterSheet.jsx';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const SHELF_ROWS = 4;

const chunkGames = (games, rowCount) => {
  if (!games.length) return [];
  const rows = Array.from({ length: Math.min(rowCount, games.length) }, () => []);
  games.forEach((game, index) => {
    rows[index % rows.length].push(game);
  });
  return rows.filter(Boolean);
};

const Library = ({ games = [], filter = {}, onFilterChange, onSelectGame }) => {
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Bộ bóc tách thời gian (Hỗ trợ game để trống thời gian)
  const checkTimeFilter = (gameTime, filterOption) => {
    // Nếu để trống trong Google Sheet -> Cho qua mọi bộ lọc
    if (!gameTime || String(gameTime).trim() === '') return true;
    
    const numbers = String(gameTime).match(/\d+/g);
    // Nếu ghi chữ mà không ghi số (vd: "Tùy ý") -> Cho qua
    if (!numbers || numbers.length === 0) return true;
    
    const minTime = parseInt(numbers[0], 10);
    const maxTime = numbers.length > 1 ? parseInt(numbers[1], 10) : minTime;

    switch (filterOption) {
      case '<15 phút': 
        return minTime <= 15;
      case '30-60 phút': 
        return maxTime > 15 && minTime <= 60;
      case '45-90 phút': 
        return maxTime >= 45;
      case 'Nhóm đông': 
        return true; 
      default: 
        return false;
    }
  };

  const filteredGames = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return games.filter((game) => {
      // 1. Lọc thời gian thông minh
      if (filter.time && !checkTimeFilter(game.time, filter.time)) return false;
      
      // 2. Lọc số người (Hỗ trợ game để trống số người)
      if (filter.players) {
        const gamePlayers = String(game.players || '').trim();
        // Chỉ lọc nếu game có ghi số người, nếu trống thì cho qua
        if (gamePlayers !== '' && gamePlayers !== filter.players) return false;
      }

      // 3. Lọc tên
      if (query) {
        const gameName = String(game.name || '').toLowerCase();
        if (!gameName.startsWith(query) && !gameName.includes(query)) return false;
      }

      return true;
    });
  }, [games, filter, searchQuery]);

  const shelves = useMemo(() => {
    if (!filteredGames.length) return [];
    return chunkGames(filteredGames, SHELF_ROWS);
  }, [filteredGames]);

  const hasActiveFilter = Boolean(filter.time || filter.players || searchQuery.trim());

  const clearAll = () => {
    setSearchQuery('');
    onFilterChange({});
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        color: '#f4f4f5',
        background: '#111216',
        padding: '18px 12px 110px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 'min(1120px, 100%)',
          margin: '0 auto',
        }}
      >
        <header style={{ textAlign: 'center', marginBottom: '18px' }}>
          {/* Đã thêm ảnh logo quán vào đây */}
          <img 
            src="/logo.png" 
            alt="Logo quán" 
            style={{ 
              height: '56px', 
              margin: '0 auto 12px', 
              display: 'block', 
              objectFit: 'contain' 
            }} 
          />
          <h1
            style={{
              margin: '8px 0 14px',
              fontSize: 'clamp(34px, 6vw, 58px)',
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#f4f4f5',
            }}
          >
            Tủ Board Game
          </h1>

          <div
            style={{
              width: 'min(420px, 92vw)',
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <Search
              size={20}
              strokeWidth={2.2}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#a1a1aa',
                pointerEvents: 'none',
              }}
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Nhập tên game (ví dụ: s, oc)"
              aria-label="Tìm kiếm game theo tên"
              style={{
                width: '100%',
                height: '46px',
                boxSizing: 'border-box',
                padding: '0 44px 0 42px',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,.10)',
                outline: 'none',
                color: '#f4f4f5',
                background: '#1a1c22',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.03), 0 8px 24px rgba(0,0,0,.20)',
              }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: 7,
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  border: 0,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,.07)',
                  color: '#d4d4d8',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Cabinet */}
        <section
          aria-label="Tủ board game"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '10px',
            border: '1px solid #34343b',
            background: 'linear-gradient(180deg, #24242a 0%, #16171b 10%, #0f1013 100%)',
            boxShadow: '0 22px 60px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.06)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'linear-gradient(90deg, rgba(255,255,255,.04), transparent 6%, transparent 94%, rgba(0,0,0,.16))',
            }}
          />

          {shelves.map((shelfGames, shelfIndex) => (
            <div
              key={`shelf-${shelfIndex}`}
              style={{
                position: 'relative',
                height: '220px',
                display: 'flex',
                alignItems: 'flex-end',
                overflowX: 'auto',
                overflowY: 'hidden',
                gap: '5px',
                padding: '14px 14px 14px',
                boxSizing: 'border-box',
                scrollSnapType: 'x proximity',
                scrollbarWidth: 'thin',
                borderBottom: shelfIndex === shelves.length - 1 ? '0' : '1px solid #151519',
                background: shelfIndex % 2 === 0
                  ? 'linear-gradient(180deg, rgba(255,255,255,.012), rgba(0,0,0,.11))'
                  : 'linear-gradient(180deg, rgba(0,0,0,.08), rgba(255,255,255,.012))',
              }}
            >
              {shelfGames.map((game) => (
                <div
                  key={game.id}
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'flex-end',
                    scrollSnapAlign: 'start',
                  }}
                >
                  <GameCard game={game} onClick={() => onSelectGame && onSelectGame(game)} />
                </div>
              ))}

              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: '14px',
                  background: 'linear-gradient(180deg, #3a332c 0%, #201c19 38%, #100f10 100%)',
                  boxShadow: '0 -2px 5px rgba(0,0,0,.35), 0 5px 10px rgba(0,0,0,.45)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          ))}

          {!filteredGames.length && (
            <div
              style={{
                minHeight: '320px',
                display: 'grid',
                placeItems: 'center',
                padding: '40px 20px',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#e4e4e7', marginBottom: 8 }}>
                  Không tìm thấy game phù hợp
                </div>
                <div style={{ fontSize: '14px', color: '#a1a1aa' }}>
                  Thử đổi từ khóa hoặc bộ lọc.
                </div>
                <button
                  type="button"
                  onClick={clearAll}
                  style={{
                    marginTop: 16,
                    border: '1px solid rgba(255,255,255,.12)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    background: '#202229',
                    color: '#f4f4f5',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Xóa tìm kiếm & bộ lọc
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={() => setFilterSheetOpen(true)}
        aria-label="Mở bộ lọc"
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          width: 56,
          height: 56,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 18,
          border: hasActiveFilter ? '1px solid rgba(245,158,11,.8)' : '1px solid rgba(255,255,255,.10)',
          background: hasActiveFilter
            ? 'linear-gradient(180deg, #f59e0b, #d97706)'
            : 'linear-gradient(180deg, #2a2c33, #1a1c22)',
          color: hasActiveFilter ? '#171717' : '#f4f4f5',
          boxShadow: hasActiveFilter
            ? '0 12px 32px rgba(245,158,11,.25)'
            : '0 12px 30px rgba(0,0,0,.35)',
          cursor: 'pointer',
          zIndex: 40,
        }}
      >
        <SlidersHorizontal size={24} strokeWidth={2.4} />
      </button>

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filter={filter}
        onFilterChange={onFilterChange}
      />
    </div>
  );
};

export default Library;