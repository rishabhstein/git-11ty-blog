// oneko.js: https://github.com/adryd325/oneko.js
// Modified: the cat walks the bottom edge of the viewport rather than roaming
// in 2D. It tracks the pointer's X only; Y is pinned to the floor every frame,
// so a resize re-seats it and scrolling never moves it (the element is
// position:fixed, so it is anchored to the viewport, not the document).
(function oneko() {
  const isReducedMotion =
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
    window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

  if (isReducedMotion) return;
  if (window.matchMedia("(hover: none)").matches) return;

  const nekoEl = document.createElement("div");

  // Half the 32px sprite, so the cat's feet land on the viewport's bottom edge.
  const floorY = () => window.innerHeight - 16;

  let nekoPosX = 32;
  let nekoPosY = floorY();
  let mousePosX = nekoPosX;
  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation = null;
  let idleAnimationFrame = 0;
  // Nothing to wait for: the cat starts asleep on the floor and only needs the
  // pointer's X once it moves.
  let isInitialized = true;

  const nekoSpeed = 10;
  const spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
    scratchWallN: [[0, 0], [0, -1]],
    scratchWallS: [[-7, -1], [-6, -2]],
    scratchWallE: [[-2, -2], [-2, -3]],
    scratchWallW: [[-4, 0], [-4, -1]],
    tired: [[-3, -2]],
    sleeping: [[-2, 0], [-2, -1]],
    N:  [[-1, -2], [-1, -3]],
    NE: [[0, -2],  [0, -3]],
    E:  [[-3, 0],  [-3, -1]],
    SE: [[-5, -1], [-5, -2]],
    S:  [[-6, -3], [-7, -2]],
    SW: [[-5, -3], [-6, -1]],
    W:  [[-4, -2], [-4, -3]],
    NW: [[-1, 0],  [-1, -1]],
  };

  nekoEl.id = "oneko";
  nekoEl.ariaHidden = true;
  nekoEl.style.width = "32px";
  nekoEl.style.height = "32px";
  nekoEl.style.position = "fixed";
  nekoEl.style.pointerEvents = "none";
  nekoEl.style.imageRendering = "pixelated";
  nekoEl.style.zIndex = 2147483647;
  nekoEl.style.backgroundImage = "url(/assets/images/oneko.gif)";
  // Mounted on <html>, not <body>: body carries the site-wide zoom (--ui-scale),
  // and zoom scales position:fixed descendants too — inside it the cat floated
  // ~10% of the viewport above the floor and could never reach the right edge.
  // <html> is unzoomed, so innerWidth/innerHeight map 1:1 to what is drawn.
  document.documentElement.appendChild(nekoEl);

  function draw() {
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
  }

  draw();

  document.addEventListener("mousemove", function (event) {
    mousePosX = event.clientX;
  });

  window.addEventListener("resize", function () {
    nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
    nekoPosY = floorY();
    draw();
  });

  let lastFrameTimestamp;

  function onAnimationFrame(timestamp) {
    if (!nekoEl.isConnected) return;
    if (!lastFrameTimestamp) lastFrameTimestamp = timestamp;
    if (timestamp - lastFrameTimestamp > 100) {
      lastFrameTimestamp = timestamp;
      if (isInitialized) frame();
    }
    window.requestAnimationFrame(onAnimationFrame);
  }

  function setSprite(name, frame) {
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function idle() {
    idleTime += 1;

    if (idleTime > 10 && Math.floor(Math.random() * 200) === 0 && idleAnimation == null) {
      let available = ["sleeping", "scratchSelf"];
      if (nekoPosX < 32) available.push("scratchWallW");
      if (nekoPosX > window.innerWidth - 32) available.push("scratchWallE");
      idleAnimation = available[Math.floor(Math.random() * available.length)];
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) { setSprite("tired", 0); break; }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) resetIdleAnimation();
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) resetIdleAnimation();
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleAnimationFrame += 1;
  }

  function frame() {
    frameCount += 1;
    // Re-pinned every frame so the cat rides the bottom edge through any
    // viewport change without needing to hear about it.
    nekoPosY = floorY();

    const diffX = nekoPosX - mousePosX;
    const distance = Math.abs(diffX);

    if (distance < nekoSpeed || distance < 48) {
      idle();
      draw();
      return;
    }

    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      draw();
      return;
    }

    // One axis, so the sprite is simply "walking left" or "walking right".
    setSprite(diffX > 0 ? "W" : "E", frameCount);
    nekoPosX -= Math.sign(diffX) * nekoSpeed;
    nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);

    draw();
  }

  window.requestAnimationFrame(onAnimationFrame);
})();
