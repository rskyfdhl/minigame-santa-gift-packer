// game/Collision.js
export const checkGiftCollision = (gift, boxes) => {
  if (gift.y < 65 || gift.y > 95) return false;

  const hitBox = boxes.find(
    (b) => Math.abs(b.x - gift.x) < 12 && b.color === gift.color
  );

  return hitBox ? hitBox : false;
};
