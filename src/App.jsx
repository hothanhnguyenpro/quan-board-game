import { useCallback, useEffect, useRef, useState } from 'react';

import AnnouncementModal from './components/AnnouncementModal.jsx';
import CheatSheet from './components/CheatSheet.jsx';
import Library from './components/Library.jsx';
import MeetupSheet from './components/MeetupSheet.jsx';
import TableSupport from './components/TableSupport.jsx';
import { APP_CONFIG } from './config.js';
import { fetchGameData } from './utils/dataFetcher.js';
import { fetchMeetupData } from './utils/meetupFetcher.js';

const scrollToTop = (behavior = 'auto') => {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior });
  }
};

const hasMeetupSource = () =>
  Boolean(
    APP_CONFIG?.meetup?.enabled &&
      String(APP_CONFIG?.meetup?.sheetUrl || '').trim()
  );

const App = () => {
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState('');
  const [gamesWarning, setGamesWarning] = useState('');
  const [filter, setFilter] = useState({});
  const [selectedGame, setSelectedGame] = useState(null);
  const [cheatSheetOrigin, setCheatSheetOrigin] = useState('library');
  const [recommendationPreferences, setRecommendationPreferences] = useState({
    players: 4,
    durationMinutes: 60,
  });

  const [isMeetupOpen, setMeetupOpen] = useState(false);
  const [meetups, setMeetups] = useState([]);
  const [meetupsLoading, setMeetupsLoading] = useState(false);
  const [meetupsError, setMeetupsError] = useState('');
  const [meetupReloadKey, setMeetupReloadKey] = useState(0);
  const meetupsFetchedRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchGameData({
      signal: controller.signal,
      onWarning: (message) => {
        if (!controller.signal.aborted) {
          setGamesWarning(message);
        }
      },
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setGames(data);
          setGamesError('');
        }
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;

        console.error('[App] Lỗi tải dữ liệu game:', error);
        setGamesError(
          error instanceof Error ? error.message : 'Không thể tải dữ liệu game.'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setGamesLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isMeetupOpen || !hasMeetupSource() || meetupsFetchedRef.current) {
      return undefined;
    }

    const controller = new AbortController();

    fetchMeetupData({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          meetupsFetchedRef.current = true;
          setMeetups(data);
          setMeetupsError('');
        }
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;

        console.error('[App] Lỗi tải lịch ghép tụ:', error);
        setMeetupsError(
          APP_CONFIG?.meetup?.loadErrorMessage ||
            'Không thể tải lịch ghép tụ. Vui lòng thử lại sau.'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setMeetupsLoading(false);
        }
      });

    return () => controller.abort();
  }, [isMeetupOpen, meetupReloadKey]);

  const handleFilterChange = useCallback((nextFilter) => {
    setFilter(nextFilter || {});
  }, []);

  const handleSelectGame = useCallback((game) => {
    if (!game) return;
    setCheatSheetOrigin('library');
    setSelectedGame(game);
    scrollToTop('smooth');
  }, []);

  const handleBackFromCheatSheet = useCallback(() => {
    setSelectedGame(null);
    scrollToTop('auto');

    if (cheatSheetOrigin === 'meetup') {
      setMeetupOpen(true);
    }

    setCheatSheetOrigin('library');
  }, [cheatSheetOrigin]);

  const handleViewMeetupRules = useCallback((game) => {
    if (!game) return;

    setCheatSheetOrigin('meetup');
    setMeetupOpen(false);
    setSelectedGame(game);
    scrollToTop('auto');
  }, []);

  const openMeetup = useCallback(() => {
    if (!APP_CONFIG?.meetup?.enabled) return;

    if (hasMeetupSource() && !meetupsFetchedRef.current) {
      setMeetupsLoading(true);
      setMeetupsError('');
    }

    setMeetupOpen(true);
  }, []);

  const closeMeetup = useCallback(() => {
    setMeetupOpen(false);
  }, []);

  const retryMeetups = useCallback(() => {
    if (!hasMeetupSource()) return;

    meetupsFetchedRef.current = false;
    setMeetupsLoading(true);
    setMeetupsError('');
    setMeetupReloadKey((value) => value + 1);
  }, []);

  const handleRegistrationSuccess = useCallback((result) => {
    if (result?.meetupId) {
      setMeetups((current) =>
        current.map((meetup) =>
          String(meetup.id) === String(result.meetupId)
            ? {
                ...meetup,
                status: result.status || meetup.status,
                currentPlayers:
                  Number.isInteger(result.currentPlayers)
                    ? result.currentPlayers
                    : meetup.currentPlayers,
              }
            : meetup
        )
      );
    }

    // Published Google Sheet CSV can lag behind Apps Script writes. Keep the
    // backend-confirmed local result instead of immediately refetching stale
    // CSV and accidentally reverting a meetup from "full" back to "active".
    // The next time the meetup sheet is opened we allow a fresh fetch.
    meetupsFetchedRef.current = false;
  }, []);

  if (gamesLoading) {
    return (
      <div className="app-state" role="status" aria-live="polite">
        <div className="loading-mark" aria-hidden="true">
          <div className="loading-spinner" />
        </div>
        <h1>Đang mở tủ game</h1>
        <p>Đang tải danh sách game...</p>
      </div>
    );
  }

  if (gamesError && !games.length) {
    return (
      <div className="app-state">
        <div className="state-icon" aria-hidden="true">⚠️</div>
        <h1>Không thể tải tủ game</h1>
        <p>{gamesError}</p>
        <button
          type="button"
          className="state-button"
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="app-root">
      {selectedGame ? (
        <CheatSheet
          game={selectedGame}
          onBack={handleBackFromCheatSheet}
          backLabel={cheatSheetOrigin === 'meetup' ? 'Danh sách tụ' : 'Tủ game'}
        />
      ) : (
        <Library
          games={games}
          filter={filter}
          onFilterChange={handleFilterChange}
          onSelectGame={handleSelectGame}
          onOpenMeetup={openMeetup}
          dataWarning={gamesWarning}
          recommendationPreferences={recommendationPreferences}
          onRecommendationPreferencesChange={setRecommendationPreferences}
        />
      )}

      <MeetupSheet
        isOpen={isMeetupOpen}
        onClose={closeMeetup}
        games={games}
        meetups={meetups}
        loading={meetupsLoading}
        error={meetupsError}
        onRetry={retryMeetups}
        onRegistrationSuccess={handleRegistrationSuccess}
        onViewRules={handleViewMeetupRules}
      />

      <AnnouncementModal onOpenMeetup={openMeetup} />

      <TableSupport
        enabled={APP_CONFIG?.tableSupport?.enabled === true}
        submitUrl={APP_CONFIG?.meetup?.registration?.submitUrl || ''}
        game={selectedGame}
      />
    </div>
  );
};

export default App;
