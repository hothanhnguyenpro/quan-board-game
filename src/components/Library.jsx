import { useDeferredValue, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  RotateCcw,
  Hourglass,
  Search,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';

import { APP_CONFIG } from '../config.js';
import { useTableContext } from '../hooks/useTableContext.js';
import { filterGames } from '../utils/gameUtils.js';
import FilterSheet from './FilterSheet.jsx';
import GameCard from './GameCard.jsx';
import GameRecommenderSheet from './GameRecommenderSheet.jsx';
import SocialLinks from './SocialLinks.jsx';
import TablePulse from './TablePulse.jsx';
import WaitlistSheet from './WaitlistSheet.jsx';

const SHELF_ROWS = 4;

const createShelves = (games) => {
  if (!games.length) return [];

  const rowCount = Math.min(SHELF_ROWS, games.length);
  const itemsPerRow = Math.ceil(games.length / rowCount);
  const rows = [];

  for (let index = 0; index < games.length; index += itemsPerRow) {
    rows.push(games.slice(index, index + itemsPerRow));
  }

  return rows;
};

const Library = ({
  games = [],
  filter = {},
  onFilterChange,
  onSelectGame,
  onOpenMeetup,
  dataWarning = '',
  recommendationPreferences,
  onRecommendationPreferencesChange,
}) => {
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isRecommenderOpen, setRecommenderOpen] = useState(false);
  const [isWaitlistOpen, setWaitlistOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const { tableCode } = useTableContext();

  const timeFilter = filter?.time ?? '';
  const playerFilter = filter?.players ?? '';

  const filteredGames = useMemo(
    () =>
      filterGames(games, {
        query: deferredSearchQuery,
        time: timeFilter,
        players: playerFilter,
      }),
    [games, deferredSearchQuery, timeFilter, playerFilter]
  );
  const shelves = useMemo(() => createShelves(filteredGames), [filteredGames]);
  const activeFilterCount = Number(Boolean(timeFilter)) + Number(Boolean(playerFilter));
  const hasActiveFilter = Boolean(timeFilter || playerFilter || searchQuery.trim());
  const brand = APP_CONFIG?.brand || {};
  const meetupEnabled = APP_CONFIG?.meetup?.enabled === true;
  const waitlistEnabled = APP_CONFIG?.waitlist?.enabled === true;
  const operationalUrl = APP_CONFIG?.meetup?.registration?.submitUrl || '';

  const updateFilter = (nextFilter) => {
    onFilterChange?.(nextFilter);
  };

  const clearAll = () => {
    setSearchQuery('');
    updateFilter({});
  };

  return (
    <main className="library-page">
      <div className="library-shell">
        <div className="library-top-actions">
          <div className="library-top-left">
            {meetupEnabled && (
              <button
                type="button"
                className="meetup-launch"
                onClick={onOpenMeetup}
              >
                <UsersRound size={18} aria-hidden="true" />
                <span>{APP_CONFIG?.meetup?.buttonLabel || 'Ghép tụ'}</span>
              </button>
            )}
            {waitlistEnabled && (
              <button
                type="button"
                className="waitlist-launch"
                onClick={() => setWaitlistOpen(true)}
              >
                <Hourglass size={18} aria-hidden="true" />
                <span>{APP_CONFIG?.waitlist?.buttonLabel || 'Chờ bàn'}</span>
              </button>
            )}
          </div>

          <SocialLinks />
        </div>

        <header className="library-header">
          <img
            src={brand.logoUrl || '/logo.png'}
            alt="Logo quán"
            className="library-logo"
          />

          <p className="eyebrow">{brand.eyebrow || 'BOARD GAME CAFE'}</p>
          <h1>{brand.libraryTitle || 'Tìm game cho bàn của bạn'}</h1>
          <p className="library-subtitle">
            {brand.librarySubtitle ||
              'Chọn số người, thời gian hoặc tìm thẳng tên game.'}
          </p>

          <div className="search-wrap">
            <Search size={19} className="search-icon" aria-hidden="true" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={brand.searchPlaceholder || 'Tìm tên game...'}
              aria-label="Tìm tên game"
              autoComplete="off"
              spellCheck={false}
            />

            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>

        </header>

        <section className="smart-pick-panel" aria-labelledby="smart-pick-title">
          <div className="smart-pick-copy">
            <span className="smart-pick-icon" aria-hidden="true">
              <Sparkles size={22} />
            </span>
            <div>
              <p className="smart-pick-kicker">CHỌN NHANH CHO CẢ BÀN</p>
              <h2 id="smart-pick-title">Chưa biết chơi game nào?</h2>
              <p>
                Nhập số người và độ dài mong muốn của <strong>một ván</strong> —
                tủ sẽ chọn 3 game hợp nhất. Đây không phải câu hỏi giờ về.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="smart-pick-button"
            onClick={() => setRecommenderOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isRecommenderOpen}
          >
            <Sparkles size={17} aria-hidden="true" />
            Gợi ý 3 game
          </button>
        </section>

        <TablePulse tableCode={tableCode} submitUrl={operationalUrl} />

        {dataWarning && (
          <div className="data-warning" role="status">
            <span aria-hidden="true">⚠️</span>
            <span>{dataWarning}</span>
          </div>
        )}

        <div className="library-summary" aria-live="polite">
          <div>
            {hasActiveFilter
              ? `${filteredGames.length} game phù hợp`
              : `${games.length} game trong tủ`}
          </div>

          {hasActiveFilter && (
            <button type="button" className="summary-clear" onClick={clearAll}>
              <RotateCcw size={14} aria-hidden="true" />
              Xóa lọc
            </button>
          )}
        </div>

        <section className="cabinet signature-cabinet" aria-label="Tủ board game">
          <div className="cabinet-glow" aria-hidden="true" />

          {shelves.map((shelfGames, shelfIndex) => (
            <div key={`shelf-${shelfIndex}`} className="cabinet-shelf">
              <div className="cabinet-side-left" aria-hidden="true" />
              <div className="cabinet-side-right" aria-hidden="true" />

              <div className="games-row">
                {shelfGames.map((game, gameIndex) => (
                  <div key={`${game.id}-${gameIndex}`} className="game-slot">
                    <GameCard game={game} onSelect={onSelectGame} />
                  </div>
                ))}
              </div>

              <div className="shelf-board" aria-hidden="true" />
            </div>
          ))}

          {!filteredGames.length && (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">🔎</div>
              <h2>Không tìm thấy game phù hợp</h2>
              <p>Thử đổi tên game hoặc bộ lọc.</p>
              <button type="button" className="empty-button" onClick={clearAll}>
                Xem toàn bộ tủ
              </button>
            </div>
          )}
        </section>
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <button
            type="button"
            className={hasActiveFilter ? 'filter-fab active' : 'filter-fab'}
            onClick={() => setFilterSheetOpen(true)}
            aria-label="Mở bộ lọc"
            aria-haspopup="dialog"
            aria-expanded={isFilterSheetOpen}
          >
            <SlidersHorizontal size={22} strokeWidth={2.2} aria-hidden="true" />
            <span className="filter-fab-label">Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="filter-fab-badge" aria-hidden="true">
                {activeFilterCount}
              </span>
            )}
          </button>,
          document.body
        )}

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        filter={filter}
        onFilterChange={updateFilter}
      />

      <GameRecommenderSheet
        isOpen={isRecommenderOpen}
        onClose={() => setRecommenderOpen(false)}
        games={games}
        preferences={recommendationPreferences}
        onPreferencesChange={onRecommendationPreferencesChange}
        onSelectGame={onSelectGame}
        tableCode={tableCode}
        submitUrl={operationalUrl}
      />

      <WaitlistSheet
        isOpen={isWaitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        submitUrl={operationalUrl}
        pollIntervalMs={APP_CONFIG?.waitlist?.pollIntervalMs}
      />
    </main>
  );
};

export default Library;
