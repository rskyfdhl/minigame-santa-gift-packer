// game/GameEngine.js
import { startGameLoop, stopGameLoop } from "./GameLoop";
import { spawnGift } from "./GiftSpawner";

export const createGameEngine = ({
  setScore,
  setLives,
  setStreak,
  setBestStreak,
  setFallingGifts,
  getState,
  endGame,
}) => {
  let spawnIntervalId = null;
  let lastTime = 0;

  const start = () => {
    stop(); // prevent double run

    // Start spawn loop
    spawnIntervalId = setInterval(() => {
      const state = getState();
      const gift = spawnGift(state.currentSpeed);
      setFallingGifts((prev) => [...prev, gift]);
    }, 900);

    // Start animation loop
    startGameLoop((time) => {
      if (!lastTime) lastTime = time;
      const deltaTime = (time - lastTime) / 16;
      lastTime = time;

      const state = getState();

      setFallingGifts((prevGifts) => {
        const updated = prevGifts.map((gift) => {
          const newY = gift.y + gift.speed * deltaTime * 0.6;

          // Check if gift missed (fell below catch zone)
          if (newY > 105 && !gift.missed) {
            gift.missed = true;

            setLives((l) => {
              const newLives = l - 1;
              if (newLives <= 0) {
                setTimeout(() => endGame(), 100);
              }
              return newLives;
            });

            setStreak(0);
            return null; // Remove gift
          }

          return { ...gift, y: newY };
        });

        // Filter out null gifts
        return updated.filter((g) => g !== null);
      });
    });
  };

  const stop = () => {
    stopGameLoop();
    if (spawnIntervalId) {
      clearInterval(spawnIntervalId);
      spawnIntervalId = null;
    }
    lastTime = 0;
  };

  return { start, stop };
};
