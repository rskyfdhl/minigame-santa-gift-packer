// game/GameLoop.js
let frameId = null;

export const startGameLoop = (callback) => {
  const loop = (time) => {
    callback(time);
    frameId = requestAnimationFrame(loop);
  };
  frameId = requestAnimationFrame(loop);
};

export const stopGameLoop = () => {
  if (frameId) {
    cancelAnimationFrame(frameId);
    frameId = null;
  }
};
