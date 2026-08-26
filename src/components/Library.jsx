import {
  useMemo,
  useState,
} from 'react';

import GameCard from './GameCard.jsx';
import FilterSheet from './FilterSheet.jsx';

import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
} from 'lucide-react';

const SHELF_ROWS = 4;

/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

const normalizeText = (value) => {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[–—−]/g, '-')
    .replace(/\s+đến\s+/gi, '-')
    .replace(/\s+den\s+/gi, '-')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

/* =========================================================
   PLAYER RANGE
   ========================================================= */

/*
  Ví dụ hỗ trợ:

  "2"
  "2-5"
  "2 – 5"
  "2—5"
  "2 - 5"
  "2 đến 5"
  "2 den 5"
  "2-5 người"
  "Không giới hạn"

  Kết quả:

  "2-5" -> { min: 2, max: 5 }
*/

const parsePlayerRange = (value) => {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  /* Không giới hạn */

  if (
    text.includes('khong gioi han') ||
    text.includes('khong han che') ||
    text.includes('unlimited')
  ) {
    return {
      min: 1,
      max: Infinity,
    };
  }

  /* Lấy các số */

  const numbers = text.match(/\d+/g);

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

/* =========================================================
   PLAYER FILTER
   ========================================================= */

/*
  Quy tắc:

  1-4
    2       ✅
    3-4     ✅
    Nhóm đông ❌

  2-5
    2       ✅
    3-4     ✅
    Nhóm đông ✅

  3-6
    2       ❌
    3-4     ✅
    Nhóm đông ✅

  5-10
    2       ❌
    3-4     ❌
    Nhóm đông ✅

  2-10
    2       ✅
    3-4     ✅
    Nhóm đông ✅
*/

const matchesPlayerFilter = (
  gamePlayers,
  selectedFilter
) => {
  if (!selectedFilter) {
    return true;
  }

  const range =
    parsePlayerRange(gamePlayers);

  if (!range) {
    return false;
  }

  const filter =
    normalizeText(selectedFilter);

  /* 2 người */

  if (filter === '2') {
    return (
      range.min <= 2 &&
      range.max >= 2
    );
  }

  /* 3-4 người */

  if (filter === '3-4') {
    return (
      range.min <= 4 &&
      range.max >= 3
    );
  }

  /*
    Nhóm đông:

    CHỈ game có max >= 5.
  */

  if (filter === 'nhom dong') {
    return range.max >= 5;
  }

  /*
    Filter lạ/không hợp lệ:
    không cho game lọt qua.
  */

  return false;
};

/* =========================================================
   TIME RANGE
   ========================================================= */

const parseTimeRange = (value) => {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const numbers = text.match(/\d+/g);

  if (!numbers || numbers.length === 0) {
    return null;
  }

  const first = Number(numbers[0]);

  if (!Number.isFinite(first)) {
    return null;
  }

  /* <15 phút -> 0-14 */

  if (text.startsWith('<')) {
    return {
      min: 0,
      max: Math.max(0, first - 1),
    };
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

/* =========================================================
   TIME FILTER
   ========================================================= */

const matchesTimeFilter = (
  gameTime,
  selectedFilter
) => {
  if (!selectedFilter) {
    return true;
  }

  const range =
    parseTimeRange(gameTime);

  if (!range) {
    return false;
  }

  const filter =
    normalizeText(selectedFilter);

  /* <15 phút */

  if (filter === '<15 phut') {
    return range.max < 15;
  }

  /* 30-60 phút */

  if (filter === '30-60 phut') {
    return (
      range.max >= 30 &&
      range.min <= 60
    );
  }

  /* 45-90 phút */

  if (filter === '45-90 phut') {
    return (
      range.max >= 45 &&
      range.min <= 90
    );
  }

  return false;
};

/* =========================================================
   SEARCH
   ========================================================= */

const matchesSearch = (
  game,
  query
) => {
  const normalizedQuery =
    normalizeText(query);

  if (!normalizedQuery) {
    return true;
  }

  const name =
    normalizeText(game?.name);

  const alias =
    normalizeText(game?.alias);

  return (
    name.startsWith(
      normalizedQuery
    ) ||
    alias.startsWith(
      normalizedQuery
    )
  );
};

/* =========================================================
   SHELVES
   ========================================================= */

const createShelves = (games) => {
  if (!games.length) {
    return [];
  }

  const rowCount = Math.min(
    SHELF_ROWS,
    games.length
  );

  const itemsPerRow = Math.ceil(
    games.length / rowCount
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

/* =========================================================
   LIBRARY
   ========================================================= */

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

  /* =======================================================
     FILTERED GAMES
     ======================================================= */

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      /* ---------------------------------------------
         1. SEARCH
         --------------------------------------------- */

      if (
        !matchesSearch(
          game,
          searchQuery
        )
      ) {
        return false;
      }

      /* ---------------------------------------------
         2. TIME
         --------------------------------------------- */

      if (
        filter?.time &&
        !matchesTimeFilter(
          game?.time,
          filter.time
        )
      ) {
        return false;
      }

      /* ---------------------------------------------
         3. PLAYERS
         --------------------------------------------- */

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

  /* =======================================================
     SHELVES
     ======================================================= */

  const shelves = useMemo(
    () => createShelves(filteredGames),
    [filteredGames]
  );

  /* =======================================================
     ACTIVE FILTER
     ======================================================= */

  const hasActiveFilter =
    Boolean(
      filter?.time ||
        filter?.players ||
        searchQuery.trim()
    );

  /* =======================================================
     CLEAR ALL
     ======================================================= */

  const clearAll = () => {
    setSearchQuery('');
    onFilterChange?.({});
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className="library-page">
      <div className="library-shell">

        {/* HEADER */}

        <header className="library-header">
          <img
            src="/logo.png"
            alt="Logo quán"
            className="library-logo"
          />

          <p className="eyebrow">
            BOARD GAME CAFE
          </p>

          <h1>
            Tìm game cho bàn của bạn
          </h1>

          <p className="library-subtitle">
            Chọn số người, thời gian
            hoặc tìm thẳng tên game.
          </p>

          {/* SEARCH */}

          <div className="search-wrap">
            <Search
              size={19}
              className="search-icon"
            />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Tìm tên game..."
              aria-label="Tìm tên game"
              autoComplete="off"
              spellCheck="false"
            />

            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() =>
                  setSearchQuery('')
                }
                aria-label="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </header>

        {/* RESULT SUMMARY */}

        <div className="library-summary">
          <div>
            {hasActiveFilter
              ? `${filteredGames.length} game phù hợp`
              : `${games.length} game trong tủ`}
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              className="summary-clear"
              onClick={clearAll}
            >
              <RotateCcw size={14} />
              Xóa lọc
            </button>
          )}
        </div>

        {/* CABINET */}

        <section
          className="cabinet"
          aria-label="Tủ board game"
        >
          <div
            className="cabinet-glow"
            aria-hidden="true"
          />

          {shelves.map(
            (
              shelfGames,
              shelfIndex
            ) => (
              <div
                key={`shelf-${shelfIndex}`}
                className="cabinet-shelf"
              >
                <div
                  className="cabinet-side-left"
                  aria-hidden="true"
                />

                <div
                  className="cabinet-side-right"
                  aria-hidden="true"
                />

                <div className="games-row">
                  {shelfGames.map(
                    (game) => (
                      <div
                        key={game.id}
                        className="game-slot"
                      >
                        <GameCard
                          game={game}
                          onClick={() =>
                            onSelectGame?.(
                              game
                            )
                          }
                        />
                      </div>
                    )
                  )}
                </div>

                <div
                  className="shelf-board"
                  aria-hidden="true"
                />
              </div>
            )
          )}

          {/* EMPTY STATE */}

          {!filteredGames.length && (
            <div className="empty-state">
              <div className="empty-icon">
                🔎
              </div>

              <h2>
                Không tìm thấy game phù hợp
              </h2>

              <p>
                Thử đổi tên game hoặc
                bộ lọc.
              </p>

              <button
                type="button"
                className="empty-button"
                onClick={clearAll}
              >
                Xem toàn bộ tủ
              </button>
            </div>
          )}
        </section>
      </div>

      {/* FILTER BUTTON */}

      <button
        type="button"
        className={
          hasActiveFilter
            ? 'filter-fab active'
            : 'filter-fab'
        }
        onClick={() =>
          setFilterSheetOpen(true)
        }
        aria-label="Mở bộ lọc"
      >
        <SlidersHorizontal
          size={22}
          strokeWidth={2.2}
        />
      </button>

      {/* FILTER SHEET */}

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() =>
          setFilterSheetOpen(false)
        }
        filter={filter}
        onFilterChange={
          onFilterChange
        }
      />
    </main>
  );
};

export default Library;