import React, { useState, useEffect } from 'react';
import Library from './components/Library';
import CheatSheet from './components/CheatSheet';
import { fetchGameData } from './utils/dataFetcher';

function App() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({});
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchGameData();
        setGames(data);
      } catch (err) {
        console.error("Lỗi:", err);
      } finally {
        // Bắt buộc tắt loading
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 font-medium">Đang tải tủ board game...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      {selectedGame ? (
        <CheatSheet game={selectedGame} onBack={() => setSelectedGame(null)} />
      ) : (
        <Library 
          games={games} 
          filter={filter} 
          onFilterChange={setFilter} 
          onSelectGame={setSelectedGame}
        />
      )}
    </div>
  );
}

export default App;