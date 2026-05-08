import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [query, setQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [playlist, setPlaylist] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [darkMode, setDarkMode] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [stats, setStats] = useState({ plays: {}, favoritesCount: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [history, setHistory] = useState([]); // Orqaga uchun history
  const [currentIndex, setCurrentIndex] = useState(-1); // Hozirgi indeks
  const timeoutRef = useRef(null);

  // Load data from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    const savedPlaylist = localStorage.getItem('playlist');
    const savedRecentSearches = localStorage.getItem('recentSearches');
    const savedDarkMode = localStorage.getItem('darkMode');
    const savedStats = localStorage.getItem('stats');
    const savedHistory = localStorage.getItem('searchHistory');

    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedPlaylist) setPlaylist(JSON.parse(savedPlaylist));
    if (savedRecentSearches) setRecentSearches(JSON.parse(savedRecentSearches));
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
    if (savedStats) setStats(JSON.parse(savedStats));
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory);
      setHistory(parsedHistory);
      setCurrentIndex(parsedHistory.length - 1);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
    localStorage.setItem('playlist', JSON.stringify(playlist));
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    localStorage.setItem('stats', JSON.stringify(stats));
    localStorage.setItem('searchHistory', JSON.stringify(history));
    
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [favorites, playlist, recentSearches, darkMode, stats, history]);

  // Add to history
  const addToHistory = (searchTerm, searchResults) => {
    if (!searchTerm.trim()) return;
    
    const newHistoryItem = {
      id: Date.now(),
      query: searchTerm,
      results: searchResults,
      timestamp: new Date().toISOString(),
      resultsCount: searchResults.length
    };
    
    const newHistory = [...history.slice(0, currentIndex + 1), newHistoryItem];
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
  };

  // Go back in history
  const goBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevItem = history[prevIndex];
      setCurrentIndex(prevIndex);
      setQuery(prevItem.query);
      setSongs(prevItem.results);
    }
  };

  // Go forward in history
  const goForward = () => {
    if (currentIndex < history.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextItem = history[nextIndex];
      setCurrentIndex(nextIndex);
      setQuery(nextItem.query);
      setSongs(nextItem.results);
    }
  };

  const searchMusic = async (searchTerm, isNewSearch = true) => {
    if (!searchTerm.trim()) {
      setSongs([]);
      return;
    }

    setLoading(true);
    setError(null);

    if (!recentSearches.includes(searchTerm)) {
      setRecentSearches(prev => [searchTerm, ...prev].slice(0, 5));
    }

    try {
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&limit=20&entity=song`
      );
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const formattedSongs = data.results.map(item => ({
          id: item.trackId,
          title: item.trackName,
          artist: { name: item.artistName },
          album: { 
            title: item.collectionName,
            cover_medium: item.artworkUrl100?.replace('100x100', '400x400') || 'https://via.placeholder.com/400x400?text=No+Cover'
          },
          duration: Math.floor(item.trackTimeMillis / 1000),
          preview: item.previewUrl,
          release_date: item.releaseDate,
          rank: item.trackNumber,
          price: item.trackPrice,
          genre: item.primaryGenreName
        }));
        
        let sortedSongs = [...formattedSongs];
        if (sortBy === 'title') {
          sortedSongs.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'artist') {
          sortedSongs.sort((a, b) => a.artist.name.localeCompare(b.artist.name));
        } else if (sortBy === 'duration') {
          sortedSongs.sort((a, b) => a.duration - b.duration);
        }
        
        setSongs(sortedSongs);
        
        // Add to history only for new searches
        if (isNewSearch) {
          addToHistory(searchTerm, sortedSongs);
        }
      } else {
        setSongs([]);
        setError(`"${searchTerm}" bo'yicha hech narsa topilmadi`);
        if (isNewSearch) {
          addToHistory(searchTerm, []);
        }
      }
    } catch (err) {
      setError(`Xatolik: ${err.message}`);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const debounce = (func, delay) => {
    return (...args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  const debouncedSearch = useCallbackRef(debounce((searchTerm) => {
    searchMusic(searchTerm, true);
  }, 500));

  function useCallbackRef(fn) {
    const ref = useRef(fn);
    ref.current = fn;
    return useRef((...args) => ref.current(...args)).current;
  }

  useEffect(() => {
    if (query.length > 1) {
      debouncedSearch(query);
    } else if (query.length === 0) {
      setSongs([]);
      setError(null);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, sortBy]);

  // Rest of your component functions remain the same...
  const toggleFavorite = (song) => {
    setFavorites(prev => {
      const exists = prev.find(s => s.id === song.id);
      if (exists) {
        return prev.filter(s => s.id !== song.id);
      } else {
        return [...prev, song];
      }
    });
  };

  const addToPlaylist = (song) => {
    if (!playlist.find(s => s.id === song.id)) {
      setPlaylist(prev => [...prev, song]);
    }
  };

  const removeFromPlaylist = (songId) => {
    setPlaylist(prev => prev.filter(s => s.id !== songId));
  };

  const playSong = (song) => {
    setStats(prev => ({
      ...prev,
      plays: {
        ...prev.plays,
        [song.id]: (prev.plays[song.id] || 0) + 1
      }
    }));
    setSelectedSong(song);
  };

  const getRandomSong = () => {
    if (songs.length > 0) {
      const randomIndex = Math.floor(Math.random() * songs.length);
      playSong(songs[randomIndex]);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  const clearHistory = () => {
    setHistory([]);
    setCurrentIndex(-1);
    localStorage.removeItem('searchHistory');
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const isFavorite = (songId) => {
    return favorites.some(s => s.id === songId);
  };

  const getTopPlayedSongs = () => {
    return Object.entries(stats.plays)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const song = [...songs, ...favorites, ...playlist].find(s => s.id === parseInt(id));
        return song ? { ...song, plays: count } : null;
      })
      .filter(s => s);
  };

  const quickSearches = ['Shape of You', 'Blinding Lights', 'Dance Monkey', 'Billie Eilish', 'Ed Sheeran'];

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      {/* Navigation Buttons */}
      <div className="nav-buttons">
        <button 
          onClick={goBack} 
          className={`nav-history-btn ${currentIndex <= 0 ? 'disabled' : ''}`}
          disabled={currentIndex <= 0}
          title="Orqaga"
        >
          ⬅️
        </button>
        <button 
          onClick={goForward} 
          className={`nav-history-btn ${currentIndex >= history.length - 1 ? 'disabled' : ''}`}
          disabled={currentIndex >= history.length - 1}
          title="Oldinga"
        >
          ➡️
        </button>
        <button onClick={() => window.location.reload()} className="nav-history-btn" title="Yangilash">
          🔄
        </button>
        <button onClick={clearHistory} className="nav-history-btn" title="Tarixni tozalash">
          🗑️
        </button>
      </div>

      {/* Mobile Menu Button */}
      <button 
        className={`mobile-menu-btn ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Sidebar */}
      <div className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>🎵 MyMusic</h2>
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button onClick={() => { setShowFavorites(false); setShowPlaylist(false); setMobileMenuOpen(false); }} className="nav-btn">
            🎧 Qidiruv
          </button>
          <button onClick={() => { setShowFavorites(true); setShowPlaylist(false); setMobileMenuOpen(false); }} className="nav-btn">
            ❤️ Sevimlilar ({favorites.length})
          </button>
          <button onClick={() => { setShowPlaylist(true); setShowFavorites(false); setMobileMenuOpen(false); }} className="nav-btn">
            📋 Pleylist ({playlist.length})
          </button>
          <button onClick={() => { getRandomSong(); setMobileMenuOpen(false); }} className="nav-btn">
            🎲 Random qo'shiq
          </button>
        </nav>

        <div className="sidebar-stats">
          <h3>📊 Statistika</h3>
          <p>⭐ Sevimlilar: {favorites.length}</p>
          <p>🎵 Pleylist: {playlist.length}</p>
          <p>🎧 Eshitilgan: {Object.values(stats.plays).reduce((a, b) => a + b, 0)}</p>
          <p>📜 Tarix: {history.length} ta qidiruv</p>
        </div>

        {recentSearches.length > 0 && (
          <div className="recent-searches">
            <div className="recent-header">
              <h3>🕒 So'nggi qidiruvlar</h3>
              <button onClick={clearRecentSearches} className="clear-btn">Tozalash</button>
            </div>
            {recentSearches.map((search, index) => (
              <button key={index} onClick={() => { setQuery(search); setMobileMenuOpen(false); }} className="recent-item">
                {search}
              </button>
            ))}
          </div>
        )}

        {/* Search History */}
        {history.length > 0 && (
          <div className="search-history">
            <div className="recent-header">
              <h3>📜 Qidiruv tarixi</h3>
            </div>
            <div className="history-list">
              {history.slice().reverse().slice(0, 10).map((item) => (
                <button 
                  key={item.id} 
                  onClick={() => { 
                    setQuery(item.query); 
                    setSongs(item.results); 
                    setCurrentIndex(history.findIndex(h => h.id === item.id));
                    setMobileMenuOpen(false);
                  }} 
                  className="history-item"
                >
                  <span>{item.query}</span>
                  <small>({item.resultsCount} ta)</small>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Rest of your JSX remains the same */}
        <header className="header">
          <h1>🎵 Musiqa Qidiruv</h1>
          <div className="search-container">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Qo'shiq nomi yoki ijrochi nomini kiriting..."
              className="search-input"
              autoFocus
            />
            {loading && <div className="loading-spinner"></div>}
          </div>

          <div className="controls-wrapper">
            <div className="sort-options">
              <label>📊 Tartiblash:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="default">Standart</option>
                <option value="title">Nomi bo'yicha</option>
                <option value="artist">Ijrochi bo'yicha</option>
                <option value="duration">Davomiyligi bo'yicha</option>
              </select>
            </div>

            <div className="quick-searches">
              {quickSearches.map((search) => (
                <button key={search} onClick={() => setQuery(search)} className="quick-search-btn">
                  {search}
                </button>
              ))}
            </div>
          </div>
        </header>

        {error && <div className="error-message">{error}</div>}

        <div className="songs-container">
          {/* Your existing content display logic */}
          {showFavorites && (
            <div className="section">
              <h2>❤️ Sevimli qo'shiqlar ({favorites.length})</h2>
              {favorites.length === 0 ? (
                <div className="empty-state">Hali sevimli qo'shiqlar yo'q 💔</div>
              ) : (
                <div className="songs-grid">
                  {favorites.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onPlay={playSong}
                      onFavorite={toggleFavorite}
                      onAddToPlaylist={addToPlaylist}
                      isFavorite={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {showPlaylist && (
            <div className="section">
              <h2>📋 Mening pleylistim ({playlist.length})</h2>
              {playlist.length === 0 ? (
                <div className="empty-state">Pleylist bo'sh 🎵</div>
              ) : (
                <div className="songs-grid">
                  {playlist.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onPlay={playSong}
                      onFavorite={toggleFavorite}
                      onRemoveFromPlaylist={removeFromPlaylist}
                      isFavorite={isFavorite(song.id)}
                      showRemove
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!showFavorites && !showPlaylist && (
            <>
              {getTopPlayedSongs().length > 0 && (
                <div className="section">
                  <h2>🏆 Eng ko'p eshitilganlar</h2>
                  <div className="songs-grid">
                    {getTopPlayedSongs().map((song) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        onPlay={playSong}
                        onFavorite={toggleFavorite}
                        onAddToPlaylist={addToPlaylist}
                        isFavorite={isFavorite(song.id)}
                        plays={song.plays}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="section">
                <h2>🔍 Qidiruv natijalari ({songs.length})</h2>
                {songs.length === 0 && !loading && query && (
                  <div className="empty-state">Hech narsa topilmadi 😔</div>
                )}
                <div className="songs-grid">
                  {songs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      onPlay={playSong}
                      onFavorite={toggleFavorite}
                      onAddToPlaylist={addToPlaylist}
                      isFavorite={isFavorite(song.id)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedSong && (
        <div className="modal" onClick={() => setSelectedSong(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedSong(null)}>×</button>
            <img src={selectedSong.album.cover_medium} alt={selectedSong.title} className="modal-cover" />
            <h2>{selectedSong.title}</h2>
            <h3>{selectedSong.artist.name}</h3>
            <p>{selectedSong.album.title}</p>
            {selectedSong.preview && (
              <audio controls autoPlay className="audio-player">
                <source src={selectedSong.preview} type="audio/mpeg" />
              </audio>
            )}
            <div className="song-details">
              <p>📅 Yil: {selectedSong.release_date?.split('-')[0] || 'Noma\'lum'}</p>
              <p>🎵 Janr: {selectedSong.genre || 'Pop'}</p>
              <p>💲 Narx: {selectedSong.price ? `$${selectedSong.price}` : 'Bepul'}</p>
            </div>
            <div className="modal-actions">
              <button onClick={() => toggleFavorite(selectedSong)} className="modal-btn">
                {isFavorite(selectedSong.id) ? '❤️ Sevimlilardan olish' : '🤍 Sevimlilarga qo\'shish'}
              </button>
              <button onClick={() => addToPlaylist(selectedSong)} className="modal-btn">
                📋 Pleylistga qo'shish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Song Card Component
function SongCard({ song, onPlay, onFavorite, onAddToPlaylist, onRemoveFromPlaylist, isFavorite, showRemove, plays }) {
  return (
    <div className="song-card">
      <img src={song.album.cover_medium} alt={song.title} className="song-cover" />
      <div className="song-info">
        <h3 className="song-title">{song.title}</h3>
        <p className="song-artist">{song.artist.name}</p>
        <p className="song-album">{song.album.title}</p>
        <div className="song-duration">
          ⏱️ {Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}
          {plays && <span className="play-count"> 🎧 {plays}</span>}
        </div>
      </div>
      <div className="song-actions">
        <button onClick={() => onPlay(song)} className="action-btn play-btn" title="Eshitish">▶️</button>
        <button onClick={() => onFavorite(song)} className="action-btn" title={isFavorite ? "Sevimlilardan olish" : "Sevimlilarga qo'shish"}>
          {isFavorite ? '❤️' : '🤍'}
        </button>
        {!showRemove ? (
          <button onClick={() => onAddToPlaylist(song)} className="action-btn" title="Pleylistga qo'shish">➕</button>
        ) : (
          <button onClick={() => onRemoveFromPlaylist(song.id)} className="action-btn" title="Pleylistdan olish">➖</button>
        )}
      </div>
    </div>
  );
}

export default App;