import React, { useMemo, useState } from 'react';
import GameCard from './GameCard.jsx';
import FilterSheet from './FilterSheet.jsx';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
} from 'lucide-react';

const SHELF_ROWS = 4;
const SHELF_HEIGHT = 235;
const CARD_GAP = 4;

/* =========================
   NORMALIZE
   ========================= */

const normalizeText = (value) => {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

/* =========================
   PARSE PLAYER RANGE
   ========================= */

const parsePlayerRange = (value) => {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  // Không giới hạn
  if (
    text.includes('không giới hạn') ||
    text.includes('không hạn chế') ||
    text.includes('unlimited')
  ) {
    return {
      min: 0,
      max: Infinity,
    };
  }

  // Hỗ trợ cả:
  // 2-5
  // 2 – 5
  // 2 — 5
  // 2 đến 5
  const normalizedRange = text
    .replace(/[–—]/g, '-')
    .replace(/\s+đến\s+/g, '-');

  const numbers = normalizedRange.match(/\d+/g);

  if (!numbers || numbers.length === 0) {
    return null;
  }

  const first = Number(numbers[0]);

  if (!Number.isFinite(first)) {
    return null;
  }

  const second =
    numbers.length >= 2
      ? Number(numbers[1])
      : first;

  if (!Number.isFinite(second)) {
    return null;
  }

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
};

/* =========================
   PLAYER FILTER
   ========================= */

const matchesPlayerFilter = (
  players,
  selectedFilter
) => {
  const normalizedFilter =
    normalizeText(selectedFilter);

  if (!normalizedFilter) {
    return true;
  }

  const range = parsePlayerRange(players);

  if (!range) {
    return false;
  }

  /*
   * 2 NGƯỜI
   *
   * 2-5  ✅
   * 2-10 ✅
   * 1-4  ✅
   * 3-5  ❌
   */
  if (normalizedFilter === '2') {
    return (
      range.min <= 2 &&
      range.max >= 2
    );
  }

  /*
   * 3-4 NGƯỜI
   *
   * 2-5  ✅
   * 3-4  ✅
   * 3-6  ✅
   * 4-8  ✅
   * 1-4  ✅
   * 5-10 ❌
   */
  if (normalizedFilter === '3-4') {
    return (
      range.max >= 3 &&
      range.min <= 4
    );
  }

  /*
   * NHÓM ĐÔNG
   *
   * Chỉ những game có thể chơi
   * với ÍT NHẤT 5 người mới được vào đây.
   *
   * 1-4   ❌
   * 2-4   ❌
   * 2-5   ✅
   * 2-10  ✅
   * 3-7   ✅
   * 4-8   ✅
   * 5-10  ✅
   */
  if (
    normalizedFilter === 'nhóm đông'
  ) {
    return range.max >= 5;
  }

  /*
   * Nếu filter không hợp lệ,
   * KHÔNG được cho tất cả game đi qua.
   *
   * Đây là điểm đã gây lỗi trước đó.
   */
  return false;
};

/* =========================
   PARSE TIME RANGE
   ========================= */

const parseTimeRange = (value) => {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const normalized = text
    .replace(/[–—]/g, '-')
    .replace(/\s+đến\s+/g, '-');

  const numbers =
    normalized.match(/\d+/g);

  if (!numbers || numbers.length === 0) {
    return null;
  }

  const first = Number(numbers[0]);

  if (!Number.isFinite(first)) {
    return null;
  }

  const second =
    numbers.length >= 2
      ? Number(numbers[1])
      : first;

  if (!Number.isFinite(second)) {
    return null;
  }

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
    raw: normalized,
  };
};

/* =========================
   TIME FILTER
   ========================= */

const matchesTimeFilter = (
  gameTime,
  selectedFilter
) => {
  const normalizedFilter =
    normalizeText(selectedFilter);

  if (!normalizedFilter) {
    return true;
  }

  const range = parseTimeRange(gameTime);

  if (!range) {
    return false;
  }

  if (
    normalizedFilter === '<15 phút'
  ) {
    return range.min < 15;
  }

  if (
    normalizedFilter === '30-60 phút'
  ) {
    return (
      range.max >= 30 &&
      range.min <= 60
    );
  }

  if (
    normalizedFilter === '45-90 phút'
  ) {
    return (
      range.max >= 45 &&
      range.min <= 90
    );
  }

  return false;
};

/* =========================
   SHELF CREATION
   ========================= */

const createShelves = (
  games,
  rowCount
) => {
  if (!games.length) {
    return [];
  }

  const totalRows = Math.min(
    rowCount,
    games.length
  );

  const itemsPerRow = Math.ceil(
    games.length / totalRows
  );

  const rows = [];

  for (
    let index = 0;
    index < games.length;
    index += itemsPerRow
  ) {
    rows.push(
      games.slice(
        index,
        index + itemsPerRow
      )
    );
  }

  return rows;
};

/* =========================
   LIBRARY
   ========================= */

const Library = ({
  games = [],
  filter = {},
  onFilterChange,
  onSelectGame,
}) => {
  const [
    isFilterSheetOpen,
    setFilterSheetOpen,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');

  /* =========================
     FILTER GAMES
     ========================= */

  const filteredGames = useMemo(() => {
    const query = normalizeText(
      searchQuery
    );

    return games.filter((game) => {
      /* SEARCH */

      const gameName = normalizeText(
        game?.name
      );

      if (
        query &&
        !gameName.startsWith(query)
      ) {
        return false;
      }

      /* TIME */

      if (
        filter?.time &&
        !matchesTimeFilter(
          game?.time,
          filter.time
        )
      ) {
        return false;
      }

      /* PLAYERS */

      if (
        filter?.players &&
        !matchesPlayerFilter(
          game?.players,
          filter.players
        )
      ) {
        return false;
      }

      return true;
    });
  }, [
    games,
    filter?.time,
    filter?.players,
    searchQuery,
  ]);

  /* =========================
     SHELVES
     ========================= */

  const shelves = useMemo(() => {
    return createShelves(
      filteredGames,
      SHELF_ROWS
    );
  }, [filteredGames]);

  /* =========================
     ACTIVE FILTER
     ========================= */

  const hasActiveFilter =
    Boolean(
      filter?.time ||
        filter?.players ||
        searchQuery.trim()
    );

  /* =========================
     CLEAR
     ========================= */

  const clearAll = () => {
    setSearchQuery('');
    onFilterChange?.({});
  };

  /* =========================
     CLICK GAME
     ========================= */

  const handleGameClick = (game) => {
    if (onSelectGame) {
      onSelectGame(game);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        padding: '18px 12px 105px',
        color: '#f4f4f5',
        background:
          'radial-gradient(circle at top, #252321 0%, #151414 38%, #0b0c0e 100%)',
      }}
    >
      <div
        style={{
          width:
            'min(1180px, 100%)',
          margin: '0 auto',
        }}
      >
        {/* HEADER */}

        <header
          style={{
            textAlign: 'center',
            marginBottom: 18,
          }}
        >
          <img
            src="/logo.png"
            alt="Logo quán"
            style={{
              height: 56,
              maxWidth: '70vw',
              margin:
                '0 auto 12px',
              display: 'block',
              objectFit: 'contain',
            }}
          />

          <h1
            style={{
              margin:
                '8px 0 14px',
              fontSize:
                'clamp(34px, 6vw, 58px)',
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing:
                '-0.04em',
              color: '#f4f4f5',
            }}
          >
            Tủ Board Game
          </h1>

          {/* SEARCH */}

          <div
            style={{
              position: 'relative',
              width:
                'min(440px, 92vw)',
              margin: '0 auto',
            }}
          >
            <Search
              size={20}
              strokeWidth={2.2}
              style={{
                position:
                  'absolute',
                left: 14,
                top: '50%',
                transform:
                  'translateY(-50%)',
                color: '#a1a1aa',
                pointerEvents:
                  'none',
              }}
            />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Nhập tên game (ví dụ: s, oc)"
              aria-label="Tìm kiếm game theo tên"
              style={{
                width: '100%',
                height: 48,
                boxSizing:
                  'border-box',
                padding:
                  '0 44px 0 42px',
                borderRadius: 14,
                border:
                  '1px solid rgba(255,255,255,.11)',
                outline: 'none',
                color: '#f4f4f5',
                background:
                  'rgba(24,25,29,.96)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,.035), 0 8px 26px rgba(0,0,0,.22)',
              }}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() =>
                  setSearchQuery('')
                }
                aria-label="Xóa tìm kiếm"
                style={{
                  position:
                    'absolute',
                  right: 8,
                  top: 8,
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems:
                    'center',
                  border: 0,
                  borderRadius: 10,
                  background:
                    'rgba(255,255,255,.07)',
                  color: '#d4d4d8',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* CABINET */}

        <section
          aria-label="Tủ board game"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 12,
            border:
              '1px solid rgba(255,255,255,.11)',
            background:
              'linear-gradient(180deg, #292725 0%, #191817 9%, #0f1012 100%)',
            boxShadow:
              '0 24px 70px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.05)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position:
                'absolute',
              inset: 0,
              pointerEvents:
                'none',
              zIndex: 20,
              background:
                'linear-gradient(90deg, rgba(255,255,255,.045), transparent 6%, transparent 94%, rgba(0,0,0,.20))',
            }}
          />

          {shelves.map(
            (
              shelfGames,
              shelfIndex
            ) => (
              <div
                key={
                  `shelf-${shelfIndex}`
                }
                style={{
                  position:
                    'relative',
                  height:
                    SHELF_HEIGHT,
                  minHeight:
                    SHELF_HEIGHT,
                  display: 'flex',
                  alignItems:
                    'flex-end',
                  gap: CARD_GAP,
                  overflowX:
                    'auto',
                  overflowY:
                    'hidden',
                  boxSizing:
                    'border-box',
                  padding:
                    '12px 14px 17px',
                  scrollbarWidth:
                    'thin',
                  borderBottom:
                    shelfIndex ===
                    shelves.length - 1
                      ? 'none'
                      : '1px solid rgba(0,0,0,.8)',
                  background:
                    shelfIndex % 2 === 0
                      ? 'linear-gradient(180deg, rgba(255,255,255,.018), rgba(0,0,0,.14))'
                      : 'linear-gradient(180deg, rgba(0,0,0,.08), rgba(255,255,255,.012))',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position:
                      'absolute',
                    top: 0,
                    left: 0,
                    width: 8,
                    height:
                      '100%',
                    background:
                      'linear-gradient(90deg, rgba(0,0,0,.24), transparent)',
                    pointerEvents:
                      'none',
                    zIndex: 5,
                  }}
                />

                <div
                  aria-hidden="true"
                  style={{
                    position:
                      'absolute',
                    top: 0,
                    right: 0,
                    width: 8,
                    height:
                      '100%',
                    background:
                      'linear-gradient(270deg, rgba(0,0,0,.24), transparent)',
                    pointerEvents:
                      'none',
                    zIndex: 5,
                  }}
                />

                {shelfGames.map(
                  (game) => (
                    <div
                      key={game.id}
                      style={{
                        flex:
                          '0 0 auto',
                        width:
                          'max-content',
                        height:
                          '100%',
                        display:
                          'flex',
                        alignItems:
                          'flex-end',
                        justifyContent:
                          'center',
                        position:
                          'relative',
                        zIndex: 2,
                      }}
                    >
                      <GameCard
                        game={game}
                        onClick={() =>
                          handleGameClick(
                            game
                          )
                        }
                      />
                    </div>
                  )
                )}

                <div
                  aria-hidden="true"
                  style={{
                    position:
                      'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 17,
                    zIndex: 8,
                    background:
                      'linear-gradient(180deg, #51463a 0%, #322a23 38%, #171412 100%)',
                    boxShadow:
                      '0 -3px 8px rgba(0,0,0,.34), 0 7px 14px rgba(0,0,0,.50)',
                    pointerEvents:
                      'none',
                  }}
                />

                <div
                  aria-hidden="true"
                  style={{
                    position:
                      'absolute',
                    left: 0,
                    right: 0,
                    bottom: 15,
                    height: 2,
                    zIndex: 9,
                    background:
                      'rgba(255,255,255,.07)',
                    pointerEvents:
                      'none',
                  }}
                />
              </div>
            )
          )}

          {!filteredGames.length && (
            <div
              style={{
                minHeight: 360,
                display: 'grid',
                placeItems:
                  'center',
                padding:
                  '40px 20px',
                textAlign:
                  'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color:
                      '#e4e4e7',
                    marginBottom: 8,
                  }}
                >
                  Không tìm thấy
                  game phù hợp
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color:
                      '#a1a1aa',
                  }}
                >
                  Thử đổi từ khóa
                  hoặc bộ lọc.
                </div>

                <button
                  type="button"
                  onClick={
                    clearAll
                  }
                  style={{
                    marginTop: 16,
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    gap: 8,
                    border:
                      '1px solid rgba(255,255,255,.11)',
                    borderRadius: 12,
                    padding:
                      '10px 15px',
                    background:
                      '#202229',
                    color:
                      '#f4f4f5',
                    fontWeight: 750,
                    cursor:
                      'pointer',
                  }}
                >
                  <RotateCcw
                    size={16}
                  />
                  Xóa bộ lọc
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* FILTER BUTTON */}

      <button
        type="button"
        onClick={() =>
          setFilterSheetOpen(
            true
          )
        }
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
          border:
            hasActiveFilter
              ? '1px solid rgba(245,158,11,.82)'
              : '1px solid rgba(255,255,255,.11)',
          background:
            hasActiveFilter
              ? 'linear-gradient(180deg, #f59e0b, #d97706)'
              : 'linear-gradient(180deg, #2a2c33, #1a1c22)',
          color:
            hasActiveFilter
              ? '#171717'
              : '#f4f4f5',
          boxShadow:
            hasActiveFilter
              ? '0 12px 34px rgba(245,158,11,.25)'
              : '0 12px 30px rgba(0,0,0,.38)',
          cursor: 'pointer',
          zIndex: 40,
        }}
      >
        <SlidersHorizontal
          size={24}
          strokeWidth={2.4}
        />
      </button>

      <FilterSheet
        isOpen={
          isFilterSheetOpen
        }
        onClose={() =>
          setFilterSheetOpen(
            false
          )
        }
        filter={filter}
        onFilterChange={
          onFilterChange
        }
      />
    </div>
  );
};

export default Library;