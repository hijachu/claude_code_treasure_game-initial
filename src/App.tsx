import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import closedChest from './assets/treasure_closed.png';
import keyIcon from './assets/key.png';
import treasureChest from './assets/treasure_opened.png';
import skeletonChest from './assets/treasure_opened_skeleton.png';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
}

interface CurrentUser {
  id: number;
  username: string;
  token: string;
}

interface ScoreRecord {
  score: number;
  result: string;
  played_at: string;
}

type AuthMode = 'landing' | 'signin' | 'signup' | 'game';

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('landing');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authError, setAuthError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [userScores, setUserScores] = useState<ScoreRecord[]>([]);

  const initializeGame = () => {
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    setBoxes(Array.from({ length: 3 }, (_, index) => ({
      id: index,
      isOpen: false,
      hasTreasure: index === treasureBoxIndex,
    })));
    setScore(0);
    setGameEnded(false);
  };

  useEffect(() => {
    if (authMode === 'game') initializeGame();
  }, [authMode]);

  // Save score when game ends
  useEffect(() => {
    if (!gameEnded || !currentUser) return;
    fetch('/api/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({ score }),
    }).then(() => fetchUserScores());
  }, [gameEnded]);

  const fetchUserScores = () => {
    if (!currentUser) return;
    fetch('/api/scores', {
      headers: { Authorization: `Bearer ${currentUser.token}` },
    })
      .then(r => r.json())
      .then(setUserScores);
  };

  const handleAuth = async (mode: 'signin' | 'signup') => {
    setAuthError('');
    if (!username.trim() || !password.trim()) {
      setAuthError('Please enter username and password');
      return;
    }
    const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || 'Something went wrong');
      return;
    }
    setCurrentUser({ ...data.user, token: data.token });
    setIsGuest(false);
    setUsername('');
    setPassword('');
    setAuthMode('game');
  };

  const handleGuest = () => {
    setIsGuest(true);
    setCurrentUser(null);
    setAuthMode('game');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsGuest(false);
    setUserScores([]);
    setAuthMode('landing');
    setUsername('');
    setPassword('');
    setAuthError('');
  };

  const openBox = (boxId: number) => {
    if (gameEnded) return;

    setBoxes(prevBoxes => {
      const updatedBoxes = prevBoxes.map(box => {
        if (box.id === boxId && !box.isOpen) {
          new Audio(box.hasTreasure ? chestOpenSound : evilLaughSound).play();
          const newScore = box.hasTreasure ? score + 150 : score - 50;
          setScore(newScore);
          return { ...box, isOpen: true };
        }
        return box;
      });

      const treasureFound = updatedBoxes.some(box => box.isOpen && box.hasTreasure);
      const openedSkeletons = updatedBoxes.filter(box => box.isOpen && !box.hasTreasure).length;

      if (openedSkeletons === 2 && !treasureFound) {
        const fullyOpened = updatedBoxes.map(box => {
          if (!box.isOpen) {
            new Audio(chestOpenSound).play();
            return { ...box, isOpen: true };
          }
          return box;
        });
        setScore(prev => prev + 150);
        setGameEnded(true);
        return fullyOpened;
      }

      if (treasureFound || updatedBoxes.every(box => box.isOpen)) {
        setGameEnded(true);
      }

      return updatedBoxes;
    });
  };

  // Landing screen
  if (authMode === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
        <h1 className="text-4xl mb-2 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-700 mb-10">Find the treasure, avoid the skeletons!</p>
        <div className="flex flex-col gap-4 w-64">
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white text-lg py-6"
            onClick={() => { setAuthMode('signup'); setAuthError(''); }}
          >
            Sign Up
          </Button>
          <Button
            variant="outline"
            className="border-amber-500 text-amber-800 hover:bg-amber-100 text-lg py-6"
            onClick={() => { setAuthMode('signin'); setAuthError(''); }}
          >
            Sign In
          </Button>
          <Button
            variant="ghost"
            className="text-amber-600 hover:bg-amber-50 text-lg py-6"
            onClick={handleGuest}
          >
            Play as Guest
          </Button>
        </div>
      </div>
    );
  }

  // Auth forms (signup / signin)
  if (authMode === 'signup' || authMode === 'signin') {
    const isSignup = authMode === 'signup';
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
        <div className="bg-white/80 backdrop-blur-sm border-2 border-amber-300 rounded-xl shadow-lg p-8 w-80">
          <h2 className="text-2xl font-semibold text-amber-900 mb-6 text-center">
            {isSignup ? 'Create Account' : 'Welcome Back'}
          </h2>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="username" className="text-amber-800">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth(authMode)}
                placeholder="Enter username"
                className="mt-1 border-amber-300 focus-visible:ring-amber-400"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-amber-800">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth(authMode)}
                placeholder="Enter password"
                className="mt-1 border-amber-300 focus-visible:ring-amber-400"
              />
            </div>
            {authError && (
              <p className="text-red-600 text-sm text-center">{authError}</p>
            )}
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white mt-2"
              onClick={() => handleAuth(authMode)}
            >
              {isSignup ? 'Sign Up' : 'Sign In'}
            </Button>
            <Button
              variant="ghost"
              className="text-amber-600 text-sm"
              onClick={() => { setAuthMode('landing'); setAuthError(''); setUsername(''); setPassword(''); }}
            >
              ← Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      {/* Header with user info */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <div className="text-amber-700 text-sm">
          {currentUser ? `👤 ${currentUser.username}` : '👤 Guest'}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-600 hover:bg-amber-100"
          onClick={handleLogout}
        >
          {currentUser ? 'Logout' : 'Exit'}
        </Button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-800 mb-4">Click on the treasure chests to discover what's inside!</p>
        <p className="text-amber-700 text-sm">💰 Treasure: +$150 | 💀 Skeleton: -$50</p>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400">
          <span className="text-amber-900">Current Score: </span>
          <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>${score}</span>
        </div>
        {gameEnded && (
          <div className={`text-2xl font-semibold text-center p-4 rounded-lg border-2 shadow-lg w-36 ${
            score > 0
              ? 'bg-green-100 border-green-400 text-green-700'
              : score === 0
              ? 'bg-amber-100 border-amber-400 text-amber-700'
              : 'bg-red-100 border-red-400 text-red-700'
          }`}>
            {score > 0 ? 'WIN 🎉' : score === 0 ? 'TIE 🤝' : 'LOSE 💀'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        {boxes.map((box) => (
          <motion.div
            key={box.id}
            className="flex flex-col items-center"
            style={{ cursor: box.isOpen ? 'default' : `url(${keyIcon}), pointer` }}
            whileHover={{ scale: box.isOpen ? 1 : 1.05 }}
            whileTap={{ scale: box.isOpen ? 1 : 0.95 }}
            onClick={() => openBox(box.id)}
          >
            <motion.div
              initial={{ rotateY: 0 }}
              animate={{ rotateY: box.isOpen ? 180 : 0, scale: box.isOpen ? 1.1 : 1 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className="relative"
            >
              <img
                src={box.isOpen ? (box.hasTreasure ? treasureChest : skeletonChest) : closedChest}
                alt={box.isOpen ? (box.hasTreasure ? 'Treasure!' : 'Skeleton!') : 'Treasure Chest'}
                className="w-48 h-48 object-contain drop-shadow-lg"
              />
              {box.isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                >
                  {box.hasTreasure ? (
                    <div className="text-2xl animate-bounce">✨💰✨</div>
                  ) : (
                    <div className="text-2xl animate-pulse">💀👻💀</div>
                  )}
                </motion.div>
              )}
            </motion.div>
            <div className="mt-4 text-center">
              {box.isOpen ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className={`text-lg p-2 rounded-lg ${
                    box.hasTreasure
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {box.hasTreasure ? '+$150' : '-$50'}
                </motion.div>
              ) : (
                <div className="text-amber-700 p-2">Click to open!</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {gameEnded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mb-4 p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
            <h2 className="text-2xl mb-2 text-amber-900">Game Over!</h2>
            <p className="text-lg text-amber-800">
              Final Score:{' '}
              <span className={score >= 0 ? 'text-green-600' : 'text-red-600'}>${score}</span>
            </p>
            <p className="text-sm text-amber-600 mt-2">
              {boxes.some(box => box.isOpen && box.hasTreasure)
                ? 'Treasure found! Well done, treasure hunter! 🎉'
                : 'No treasure found this time! Better luck next time! 💀'}
            </p>
          </div>

          {/* Score history for logged-in users */}
          {currentUser && userScores.length > 0 && (
            <div className="mb-4 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-amber-300 shadow text-left min-w-64">
              <h3 className="text-amber-900 font-semibold mb-2 text-center">📊 Your Recent Scores</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-amber-700 border-b border-amber-200">
                    <th className="pb-1 text-left">Date</th>
                    <th className="pb-1 text-center">Score</th>
                    <th className="pb-1 text-right">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {userScores.map((s, i) => (
                    <tr key={i} className="border-b border-amber-100 last:border-0">
                      <td className="py-1 text-amber-700">
                        {new Date(s.played_at).toLocaleDateString()}
                      </td>
                      <td className={`py-1 text-center font-medium ${s.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${s.score}
                      </td>
                      <td className="py-1 text-right capitalize text-amber-800">{s.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button
            onClick={initializeGame}
            className="text-lg px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white"
          >
            Play Again
          </Button>
        </motion.div>
      )}
    </div>
  );
}
