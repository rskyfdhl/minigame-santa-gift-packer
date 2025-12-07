// src/game/SantaGiftPacker.jsx
import React, { useState, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";

// Icons
import { Gift, Trophy, Heart, Wallet } from "lucide-react";

// Web3
import { submitScoreOnChain } from "../web3/submitScore";
import {
  connectWallet,
  getConnectedWallet,
  disconnectWallet,
} from "../web3/wallet";

// Supabase
import {
  getPlayerByWallet,
  createPlayer,
  checkUsernameExists,
} from "../supabase/players";
import { saveScoreDB, updateBestScore } from "../supabase/scores";
import {
  getLeaderboard,
  subscribeToLeaderboard,
} from "../supabase/leaderboard";
import bgMusicFile from "/audio/christmas-holiday.mp3";
import correctSoundFile from "/audio/correct.mp3";
import wrongSoundFile from "/audio/wrong.mp3";
import gameOverSoundFile from "/audio/gameover.mp3";
import winSoundFile from "/audio/win.mp3";

const GIFT_TYPES = ["🎁", "🎀", "🎄", "⭐"];
const GIFT_COLORS = ["red", "green", "blue", "yellow"];
const MAX_SCORE = 10000;
const INITIAL_LIVES = 5;
const BASE_SPEED = 1.0;

const SantaGiftPacker = () => {
  const [gameState, setGameState] = useState("auth");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [fallingGifts, setFallingGifts] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [currentSpeed, setCurrentSpeed] = useState(BASE_SPEED);

  const [leaderboard, setLeaderboard] = useState([]);
  const [wallet, setWallet] = useState("");
  const [player, setPlayer] = useState(null);
  const [tempUsername, setTempUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const gameAreaRef = useRef(null);
  const requestRef = useRef();
  const lastTimeRef = useRef(0);
  // ===== AUDIO REFS =====
  const bgMusic = useRef(null);
  const correctSfx = useRef(null);
  const wrongSfx = useRef(null);
  const gameoverSfx = useRef(null);
  const winSfx = useRef(null);

  useEffect(() => {
    checkWalletConn();
    loadLeaderboard();

    const channel = subscribeToLeaderboard(() => loadLeaderboard());
    return () => channel.unsubscribe();
  }, []);
  useEffect(() => {
    bgMusic.current = new Audio(bgMusicFile);
    bgMusic.current.loop = true;
    bgMusic.current.volume = 0.4;

    correctSfx.current = new Audio(correctSoundFile);
    wrongSfx.current = new Audio(wrongSoundFile);
    gameoverSfx.current = new Audio(gameOverSoundFile);
    winSfx.current = new Audio(winSoundFile);
  }, []);
  // === Audio Play Helpers ===
  const playCorrect = () => correctSfx.current?.play();
  const playWrong = () => wrongSfx.current?.play();
  const playGameOver = () => gameoverSfx.current?.play();
  const playWin = () => winSfx.current?.play();

  const checkWalletConn = async () => {
    try {
      const acc = await getConnectedWallet();
      if (acc) {
        setWallet(acc.address);
        loadPlayer(acc.address);
      }
    } catch (err) {
      console.log("No wallet connected");
    }
  };

  const loadPlayer = async (address) => {
    try {
      const exists = await getPlayerByWallet(address);
      if (exists) {
        setPlayer(exists);
        setGameState("menu");
      } else {
        setGameState("setUsername");
      }
    } catch (err) {
      console.error("Error loading player:", err);
    }
  };

  const connectWalletAuth = async () => {
    try {
      setIsLoading(true);
      setAuthError("");
      const acc = await connectWallet();
      setWallet(acc.address);
      await loadPlayer(acc.address);
    } catch (err) {
      setAuthError("Failed to connect wallet");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlayer = async () => {
    const username = tempUsername.trim();

    if (!username) {
      setAuthError("Please enter a username!");
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setAuthError("Username must be between 3-20 characters!");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setAuthError("Username can only contain letters, numbers, - and _");
      return;
    }

    try {
      setIsLoading(true);
      setAuthError("");

      const exists = await checkUsernameExists(username);
      if (exists) {
        setAuthError("Username already taken!");
        return;
      }

      const newPlayer = await createPlayer(username, wallet);
      setPlayer(newPlayer);
      setGameState("menu");
      toast.success("Profile created!");
    } catch (err) {
      setAuthError("Failed to create player");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeBoxes = () => {
    setBoxes(
      GIFT_COLORS.map((color, idx) => ({
        id: idx,
        color,
        x: 12 + idx * 21,
      }))
    );
  };

  const startGame = () => {
    bgMusic.current?.play();
    setHasSubmitted(false);
    setGameState("playing");
    setScore(0);
    setLives(INITIAL_LIVES);
    setFallingGifts([]);
    setStreak(0);
    setBestStreak(0);
    setCurrentSpeed(BASE_SPEED);
    initializeBoxes();
    lastTimeRef.current = 0;
  };

  const endGame = async () => {
    if (gameState === "gameover") return;

    const isWinner = score >= MAX_SCORE;

    if (isWinner) {
      playWin();
    } else {
      playGameOver();
    }

    setGameState("gameover");

    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }

    bgMusic.current?.pause();
  };

  const submitToBlockchain = async () => {
    if (!player || hasSubmitted) {
      toast.error("Score already submitted!");
      return;
    }

    try {
      setIsLoading(true);

      // 1. Submit ke blockchain DULU
      const receipt = await submitScoreOnChain(
        player.username,
        score,
        bestStreak
      );

      console.log("Transaction receipt:", receipt);

      const txHash = receipt.hash || receipt.transactionHash;

      if (!txHash) {
        toast.error("❌ Transaction hash not found");
        return;
      }

      console.log("TX Hash:", txHash);

      // 2. SETELAH berhasil di blockchain, BARU save ke database
      toast.loading("Saving to database...", { id: "save-db" });

      const scoreData = {
        player_id: player.id,
        username: player.username,
        wallet_address: wallet,
        score,
        best_streak: bestStreak,
        tx_hash: txHash,
      };

      await saveScoreDB(scoreData);

      const result = await updateBestScore({
        playerId: player.id,
        username: player.username,
        walletAddress: wallet,
        score,
        bestStreak,
        txHash: txHash,
      });

      toast.dismiss("save-db");

      setHasSubmitted(true);

      await loadLeaderboard();

      if (result.updated) {
        toast.success(`🎉 New high score! TX: ${txHash.slice(0, 10)}...`);
      } else {
        toast.success(`✅ Score saved! TX: ${txHash.slice(0, 10)}...`);
      }
    } catch (err) {
      toast.error("❌ Failed to submit score");
      console.error("Submit error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard(10);
      setLeaderboard(data);
    } catch (err) {
      console.error("Error loading leaderboard:", err);
    }
  };

  const logout = () => {
    disconnectWallet();
    setWallet("");
    setPlayer(null);
    setGameState("auth");
  };

  // Game loop
  useEffect(() => {
    if (gameState === "playing") {
      const spawnInterval = setInterval(() => {
        const gift = {
          id: Date.now() + Math.random(),
          type: GIFT_TYPES[Math.floor(Math.random() * GIFT_TYPES.length)],
          color: GIFT_COLORS[Math.floor(Math.random() * GIFT_COLORS.length)],
          x: Math.random() * 70 + 15,
          y: -5,
          speed: currentSpeed + Math.random() * 0.3,
        };
        setFallingGifts((prev) => [...prev, gift]);
      }, 1200);

      const animate = (time) => {
        if (gameState !== "playing") return;

        if (!lastTimeRef.current) lastTimeRef.current = time;

        const deltaTime = (time - lastTimeRef.current) / 16;
        lastTimeRef.current = time;

        setFallingGifts((prev) => {
          const updated = prev.map((gift) => {
            const newY = gift.y + gift.speed * deltaTime * 0.6;

            if (newY > 105) {
              playWrong();
              setLives((l) => {
                const newLives = l - 1;
                if (newLives <= 0) endGame();
                return newLives;
              });
              setStreak(0);
              return null;
            }

            return { ...gift, y: newY };
          });

          return updated.filter(Boolean);
        });

        requestRef.current = requestAnimationFrame(animate);
      };

      requestRef.current = requestAnimationFrame(animate);

      return () => {
        clearInterval(spawnInterval);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
    }
  }, [gameState, currentSpeed]);

  const handleBoxClick = (box) => {
    const matchingGift = fallingGifts.find(
      (gift) => gift.color === box.color && gift.y > 65 && gift.y < 95
    );

    // === BENAR ===
    if (matchingGift) {
      playCorrect();

      const points = 10 + Math.min(streak, 20) * 2;
      setScore((s) => s + points);

      setStreak((st) => {
        const newStreak = Math.min(st + 1, 20);
        setBestStreak((b) => Math.max(b, newStreak));
        return newStreak;
      });

      setFallingGifts((prev) => prev.filter((g) => g.id !== matchingGift.id));
      return;
    }

    // === SALAH ===
    playWrong();
    setStreak(0);
    setLives((l) => {
      const newLives = l - 1;
      if (newLives <= 0) endGame();
      return newLives;
    });
  };

  useEffect(() => {
    const milestone = Math.floor(score / 1000);
    const newSpeed = BASE_SPEED + milestone * 0.08;

    setCurrentSpeed(newSpeed);
  }, [score]);

  const getColorClass = (color) => {
    const colors = {
      red: "bg-red-500",
      green: "bg-green-500",
      blue: "bg-blue-500",
      yellow: "bg-yellow-500",
    };
    return colors[color] || "bg-gray-500";
  };

  // ------- UI -------
  if (gameState === "auth") {
    return (
      <div className="min-h-screen  from-blue-900 via-blue-800 to-blue-900 text-white p-4 flex items-center justify-center">
        <Toaster position="top-center" />
        <div className="max-w-md w-full text-center">
          <h1 className="text-5xl font-bold mb-4 text-yellow-300">
            🎅 Santa's Gift Packer
          </h1>
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8">
            <Wallet className="mx-auto mb-4 text-yellow-300" size={48} />
            <button
              onClick={connectWalletAuth}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-purple-600 rounded-xl font-bold text-xl hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? "Connecting..." : "🔗 Connect Wallet"}
            </button>
            {authError && <p className="mt-4 text-red-400">{authError}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "setUsername") {
    return (
      <div className="min-h-screen  from-blue-900 via-blue-800 to-blue-900 text-white p-4 flex items-center justify-center">
        <Toaster position="top-center" />
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8">
            <h1 className="text-3xl font-bold mb-4 text-center">
              Choose Username
            </h1>
            <div className="bg-white/5 rounded-lg p-3 mb-4 text-sm">
              <span className="text-blue-200">Wallet: </span>
              <span className="font-mono">
                {wallet.slice(0, 6)}...{wallet.slice(-4)}
              </span>
            </div>

            <input
              className="w-full p-3 rounded-lg text-black mb-4"
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              placeholder="Enter username (3-20 chars)"
              maxLength={20}
            />

            <button
              onClick={handleCreatePlayer}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-green-600 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "✅ Create Profile"}
            </button>

            {authError && (
              <p className="mt-4 text-red-400 text-sm text-center">
                {authError}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "menu") {
    return (
      <div className="min-h-screen  from-blue-900 via-blue-800 to-blue-900 text-white flex justify-center items-start px-2 py-4">
        <div className="w-full max-w-4xl">
          <Toaster position="top-center" />
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl font-bold text-center text-yellow-300 mb-2">
              🎅 Santa's Gift Packer
            </h1>
            <p className="text-center text-xl mb-4">
              Welcome,{" "}
              <span className="font-bold text-green-300">
                {player?.username}
              </span>
              !
            </p>

            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-6">
              <button
                onClick={startGame}
                className="w-full px-6 py-4 bg-green-600 rounded-sm font-bold text-xl hover:bg-green-700"
              >
                🎮 START GAME
              </button>

              <button
                onClick={logout}
                className="w-full mt-4 px-4 py-2 bg-red-500 rounded-sm hover:bg-red-600"
              >
                🚪 Logout
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="text-yellow-300" />
                Leaderboard
              </h2>
              {leaderboard.length === 0 ? (
                <p className="text-center text-blue-200">
                  No scores yet. Be the first!
                </p>
              ) : (
                leaderboard.map((x, i) => (
                  <div
                    key={x.id || i}
                    className="p-4 bg-white/5 rounded-sm mb-2 flex justify-between items-center"
                  >
                    <div>
                      <span className="text-2xl mr-2">
                        {i === 0
                          ? "🥇"
                          : i === 1
                          ? "🥈"
                          : i === 2
                          ? "🥉"
                          : `${i + 1}.`}
                      </span>
                      <span className="font-semibold">{x.username}</span>
                      <div className="text-xs text-blue-300 font-mono">
                        {x.wallet_address.slice(0, 6)}...
                        {x.wallet_address.slice(-4)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-yellow-300">
                        {x.highest_score.toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-300">
                        Streak: {x.best_streak}x
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 mt-6">
              <h2 className="text-2xl font-bold mb-4 text-yellow-300 flex items-center gap-2">
                📜 Game Rules
              </h2>

              <ul className="space-y-3 text-blue-200 text-lg leading-relaxed">
                <li>
                  🎁{" "}
                  <span className="text-white">
                    Catch the falling gifts and match them with the correct
                    colored box.
                  </span>
                </li>
                <li>
                  💔{" "}
                  <span className="text-white">
                    You lose 1 life if a gift falls or if you choose the wrong
                    color.
                  </span>
                </li>
                <li>
                  🔥{" "}
                  <span className="text-white">
                    Your streak resets whenever you miss or pick the wrong
                    color.
                  </span>
                </li>
                <li>
                  🌟{" "}
                  <span className="text-white">
                    Maximum streak is capped at 20x, even if you keep catching
                    correctly.
                  </span>
                </li>
                <li>
                  ⚡{" "}
                  <span className="text-white">
                    Gift falling speed increases every time your score reaches
                    each 1000 milestone.
                  </span>
                </li>
                <li>
                  🏃{" "}
                  <span className="text-white">
                    The higher your score, the faster the gifts drop (up to 1.8x
                    speed).
                  </span>
                </li>
                <li>
                  🎯{" "}
                  <span className="text-white">
                    Your main goal is to reach the highest score without losing
                    all lives.
                  </span>
                </li>
                <li>
                  🏆{" "}
                  <span className="text-white">
                    Submit your score to the blockchain to permanently secure
                    your spot on the leaderboard!
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "playing") {
    return (
      <div className="min-h-screen  from-blue-900 via-blue-800 to-blue-900 text-white p-4">
        <Toaster position="top-center" />
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-sm text-blue-200">Score</div>
              <div className="text-2xl font-bold text-yellow-300">
                {score.toLocaleString()}
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-sm text-blue-200">Lives</div>
              <div className="text-2xl">
                {[...Array(INITIAL_LIVES)].map((_, i) => (
                  <Heart
                    key={i}
                    className={`inline ${
                      i < lives ? "fill-red-500 text-red-500" : "text-gray-500"
                    }`}
                    size={24}
                  />
                ))}
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-sm text-blue-200">Streak</div>
              <div className="text-2xl font-bold text-green-300">{streak}x</div>
            </div>
          </div>

          <div className="w-full flex justify-center items-center">
            <div
              ref={gameAreaRef}
              className="relative bg-white/10 backdrop-blur-xs  from-sky-500 to-blue-600 rounded-2xl overflow-hidden aspect-[9/16] w-full max-w-[480px]"
            >
              {fallingGifts.map((gift) => (
                <div
                  key={gift.id}
                  className="absolute text-4xl"
                  style={{
                    left: `${gift.x}%`,
                    top: `${gift.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div
                    className={`${getColorClass(gift.color)} rounded-lg p-2`}
                  >
                    {gift.type}
                  </div>
                </div>
              ))}

              <div
                className="absolute left-0 right-0 bg-green-400/10 border-y-2 border-green-400/30"
                style={{ top: "65%", height: "30%" }}
              >
                <div className="text-center text-green-300 text-xs mt-1">
                  CATCH ZONE
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-blue-900/50">
                <div className="flex justify-between gap-2 px-1">
                  {boxes.map((box) => (
                    <button
                      key={box.id}
                      onClick={() => handleBoxClick(box)}
                      className={`${getColorClass(
                        box.color
                      )} w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-4 border-white shadow-2xl active:scale-95`}
                    >
                      <Gift className="mx-auto" size={32} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "gameover") {
    const isWinner = score >= MAX_SCORE;

    return (
      <div className="min-h-screen  from-blue-900 via-blue-800 to-blue-900 text-white flex justify-center">
        <div className="w-full max-w-[900px] px-4">
          {" "}
          <Toaster position="top-center" />
          <div className="max-w-2xl w-full">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-center">
              <h1
                className={`text-5xl font-bold mb-4 ${
                  isWinner ? "text-yellow-300" : "text-red-300"
                }`}
              >
                {isWinner ? "🎉 YOU WIN! 🎉" : "💔 Game Over!"}
              </h1>
              <p className="text-2xl mb-2">
                Player:{" "}
                <span className="font-bold text-green-300">
                  {player?.username}
                </span>
              </p>
              <p className="text-6xl font-bold text-yellow-300 mb-2">
                {score.toLocaleString()}
              </p>
              <p className="text-xl text-blue-200 mb-4">
                {isWinner ? "Target 100,000 reached!" : `out of 100,000 target`}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Best Streak</div>
                  <div className="text-3xl font-bold text-green-300">
                    {bestStreak}x
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-blue-200">Wallet</div>
                  <div className="text-xs font-mono text-blue-300">
                    {wallet.slice(0, 6)}...{wallet.slice(-4)}
                  </div>
                </div>
              </div>

              {!hasSubmitted && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-4">
                  <p className="text-yellow-300 font-semibold mb-2">
                    ⚠️ Score not saved yet!
                  </p>
                  <p className="text-sm text-yellow-200">
                    Submit your score to blockchain to save it permanently
                  </p>
                </div>
              )}

              {hasSubmitted && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-4">
                  <p className="text-green-300 font-semibold">
                    ✅ Score submitted successfully!
                  </p>
                </div>
              )}
              <button
                onClick={submitToBlockchain}
                disabled={isLoading || hasSubmitted}
                className="w-full mb-4 px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl font-bold text-xl hover:opacity-90 disabled:opacity-50"
              >
                {isLoading
                  ? "Submitting..."
                  : hasSubmitted
                  ? "Submitted"
                  : "📤 Submit to Blockchain"}
              </button>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setGameState("menu");
                    loadLeaderboard();
                  }}
                  className="flex-1 px-6 py-4 bg-white/10 rounded-xl font-bold text-xl hover:bg-white/20 transition-all active:scale-95"
                >
                  📊 Leaderboard
                </button>
                <button
                  onClick={startGame}
                  className="w-full px-6 py-4 bg-green-600 rounded-xl font-bold text-xl hover:bg-green-700"
                >
                  🔁 Play Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SantaGiftPacker;
