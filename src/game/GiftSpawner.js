// game/GiftSpawner.js
const GIFT_TYPES = ["🎁", "🎀", "🎄", "⭐"];
const GIFT_COLORS = ["red", "green", "blue", "yellow"];

export const spawnGift = (speed) => {
  return {
    id: Date.now() + Math.random(),
    type: GIFT_TYPES[Math.floor(Math.random() * GIFT_TYPES.length)],
    color: GIFT_COLORS[Math.floor(Math.random() * GIFT_COLORS.length)],
    x: Math.random() * 70 + 15,
    y: -5,
    speed: speed + Math.random() * 0.3,
  };
};
