import React, {
  useEffect,
  useState,
} from 'react';

import Library from './components/Library';
import CheatSheet from './components/CheatSheet';
import { fetchGameData } from './utils/dataFetcher';

const App = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({});
  const [selectedGame, setSelectedGame] =
    useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data =
          await fetchGameData();

        if (cancelled) {
          return;
        }

        setGames(data);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          '[App] Lỗi tải dữ liệu:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải dữ liệu game.'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFilterChange =
    (newFilter) => {
      setFilter(
        newFilter || {}
      );
    };

  const handleSelectGame =
    (game) => {
      setSelectedGame(game);
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

  const handleBackToLibrary =
    () => {
      setSelectedGame(null);
      window.scrollTo({
        top: 0,
        behavior: 'instant',
      });
    };

  if (loading) {
    return (
      <div className="app-state">
        <div className="loading-mark">
          <div className="loading-spinner" />
        </div>

        <h1>
          Đang mở tủ game
        </h1>

        <p>
          Đang tải danh sách game...
        </p>
      </div>
    );
  }

  if (error && !games.length) {
    return (
      <div className="app-state">
        <div className="state-icon">
          ⚠️
        </div>

        <h1>
          Không thể tải tủ game
        </h1>

        <p>{error}</p>

        <button
          type="button"
          className="state-button"
          onClick={() =>
            window.location.reload()
          }
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
          onBack={
            handleBackToLibrary
          }
        />
      ) : (
        <Library
          games={games}
          filter={filter}
          onFilterChange={
            handleFilterChange
          }
          onSelectGame={
            handleSelectGame
          }
        />
      )}
    </div>
  );
};

export default App;