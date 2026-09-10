// ===== DUCK DODGE - version 1 =====
// Everything you see in the game is drawn onto the <canvas> 60 times a second.

// ---------- 1. Setup ----------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");   // "ctx" is our paintbrush

const W = canvas.width;    // 800
const H = canvas.height;   // 520
const GROUND_Y = H - 70;   // where the grass starts

// ---------- 2. Game variables ----------
let state = "ready";       // "ready", "playing", or "over"
let score = 0;
let highScore = loadHighScore();

const duck = {
  x: W / 2,
  y: GROUND_Y - 22,
  radius: 22,
  speed: 340,              // pixels per second
  facing: 1                // 1 = right, -1 = left
};

let rocks = [];            // all the falling objects live in this list
let spawnTimer = 0;        // counts down to the next rock
let clouds = [
  { x: 120, y: 90,  size: 1.0, speed: 12 },
  { x: 430, y: 140, size: 0.7, speed: 18 },
  { x: 660, y: 70,  size: 1.2, speed: 8 }
];

// ---------- 3. Keyboard ----------
const keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;

  // Space starts a new game (and stops the page from scrolling)
  if (e.code === "Space") {
    e.preventDefault();
    if (state !== "playing") startGame();
  }
  if (["arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault();
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// ---------- 3b. Touch buttons (phones and tablets) ----------
// Same test style.css uses to decide whether to show the arrow buttons.
const isTouchScreen = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

// Holding a button works exactly like holding down that arrow key.
function holdButton(buttonId, keyName) {
  const button = document.getElementById(buttonId);

  const press = (e) => {
    e.preventDefault();
    keys[keyName] = true;
    button.classList.add("pressed");
  };
  const release = () => {
    keys[keyName] = false;
    button.classList.remove("pressed");
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

holdButton("left-btn", "arrowleft");
holdButton("right-btn", "arrowright");

// Phones have no Space bar, so tapping the game starts or restarts it.
if (isTouchScreen) {
  canvas.addEventListener("pointerdown", () => {
    if (state !== "playing") startGame();
  });
}

// ---------- 4. Starting / restarting ----------
function startGame() {
  state = "playing";
  score = 0;
  rocks = [];
  spawnTimer = 0.8;
  duck.x = W / 2;
}

function gameOver() {
  state = "over";
  if (Math.floor(score) > highScore) {
    highScore = Math.floor(score);
    saveHighScore(highScore);
  }
}

// ---------- 5. High score (saved in the browser) ----------
function loadHighScore() {
  try {
    return Number(localStorage.getItem("duckDodgeHighScore")) || 0;
  } catch (err) {
    return 0;   // some browsers block storage; the game still works
  }
}

function saveHighScore(value) {
  try {
    localStorage.setItem("duckDodgeHighScore", value);
  } catch (err) {
    /* ignore */
  }
}

// ---------- 6. Update: the rules of the game ----------
// dt = "delta time" = how many seconds passed since the last frame.
// Multiplying by dt keeps the speed the same on fast and slow screens.
function update(dt) {
  // clouds drift no matter what, even on the menu
  for (const c of clouds) {
    c.x += c.speed * dt;
    if (c.x - 80 > W) c.x = -80;
  }

  if (state !== "playing") return;

  // --- move the duck ---
  let dir = 0;
  if (keys["arrowleft"] || keys["a"]) dir -= 1;
  if (keys["arrowright"] || keys["d"]) dir += 1;

  duck.x += dir * duck.speed * dt;
  if (dir !== 0) duck.facing = dir;

  // keep the duck on screen
  duck.x = Math.max(duck.radius, Math.min(W - duck.radius, duck.x));

  // --- spawn new rocks ---
  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnRock();
    spawnTimer = 0.55;     // a new rock every 0.55 seconds
  }

  // --- move rocks and check for hits ---
  for (let i = rocks.length - 1; i >= 0; i--) {
    const r = rocks[i];
    r.y += r.speed * dt;
    r.spin += dt * 2;

    if (hitsDuck(r)) {
      gameOver();
      return;
    }
    if (r.y - r.radius > H) rocks.splice(i, 1);   // gone off the bottom
  }

  // --- score goes up the longer you survive ---
  score += dt * 10;
}

function spawnRock() {
  const radius = 14 + Math.random() * 12;
  rocks.push({
    x: radius + Math.random() * (W - radius * 2),
    y: -radius,
    radius: radius,
    speed: 190 + Math.random() * 120,
    spin: Math.random() * 6
  });
}

// Circle vs circle collision. The 0.75 makes the duck's hitbox a little
// smaller than he looks, so near misses feel fair instead of cheap.
function hitsDuck(rock) {
  const dx = rock.x - duck.x;
  const dy = rock.y - duck.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < rock.radius + duck.radius * 0.75;
}

// ---------- 7. Draw ----------
function draw() {
  drawBackground();

  for (const r of rocks) drawRock(r);
  drawDuck();
  drawHUD();

  const startWord = isTouchScreen ? "Tap" : "Press Space";
  if (state === "ready") drawOverlay("Duck Dodge", startWord + " to play");
  if (state === "over") drawOverlay("Splat!", startWord + " to try again");
}

function drawBackground() {
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, "#5cc0f5");
  sky.addColorStop(1, "#cdefff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // sun
  ctx.fillStyle = "#ffe066";
  ctx.beginPath();
  ctx.arc(700, 80, 46, 0, Math.PI * 2);
  ctx.fill();

  // clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  for (const c of clouds) drawCloud(c.x, c.y, c.size);

  // far hills
  ctx.fillStyle = "#6fbf73";
  drawHill(150, GROUND_Y + 10, 220, 120);
  drawHill(420, GROUND_Y + 10, 300, 90);
  drawHill(680, GROUND_Y + 10, 250, 130);

  // grass
  ctx.fillStyle = "#4ea75a";
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = "#3f8c4a";
  ctx.fillRect(0, GROUND_Y, W, 8);
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, 26 * size, 0, Math.PI * 2);
  ctx.arc(x + 28 * size, y + 6 * size, 20 * size, 0, Math.PI * 2);
  ctx.arc(x - 28 * size, y + 8 * size, 18 * size, 0, Math.PI * 2);
  ctx.fill();
}

function drawHill(cx, baseY, width, height) {
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, baseY);
  ctx.quadraticCurveTo(cx, baseY - height * 2, cx + width / 2, baseY);
  ctx.fill();
}

function drawDuck() {
  ctx.save();
  ctx.translate(duck.x, duck.y);
  ctx.scale(duck.facing, 1);   // flips the duck when he turns around

  // body
  ctx.fillStyle = "#ffd94a";
  ctx.beginPath();
  ctx.ellipse(0, 6, 24, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // tail
  ctx.beginPath();
  ctx.moveTo(-20, 0);
  ctx.lineTo(-34, -6);
  ctx.lineTo(-20, 10);
  ctx.fill();

  // head
  ctx.beginPath();
  ctx.arc(14, -14, 13, 0, Math.PI * 2);
  ctx.fill();

  // beak
  ctx.fillStyle = "#ff9f1c";
  ctx.beginPath();
  ctx.moveTo(24, -16);
  ctx.lineTo(38, -12);
  ctx.lineTo(24, -8);
  ctx.fill();

  // wing
  ctx.fillStyle = "#f0c020";
  ctx.beginPath();
  ctx.ellipse(-4, 6, 12, 9, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // eye
  ctx.fillStyle = "#3a2a00";
  ctx.beginPath();
  ctx.arc(19, -17, 2.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRock(r) {
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.rotate(r.spin);

  ctx.fillStyle = "#7d7266";
  ctx.beginPath();
  ctx.moveTo(-r.radius, 0);
  ctx.lineTo(-r.radius * 0.5, -r.radius);
  ctx.lineTo(r.radius * 0.6, -r.radius * 0.8);
  ctx.lineTo(r.radius, r.radius * 0.2);
  ctx.lineTo(0, r.radius);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(-r.radius * 0.25, -r.radius * 0.3, r.radius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHUD() {
  ctx.font = "700 26px Fredoka, Trebuchet MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillText("Score " + Math.floor(score), 22, 42);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Score " + Math.floor(score), 20, 40);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillText("Best " + highScore, W - 18, 42);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Best " + highScore, W - 20, 40);
}

function drawOverlay(title, subtitle) {
  ctx.fillStyle = "rgba(8, 30, 45, 0.55)";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffd94a";
  ctx.font = "700 62px Fredoka, Trebuchet MS, sans-serif";
  ctx.fillText(title, W / 2, H / 2 - 20);

  ctx.fillStyle = "#ffffff";
  ctx.font = "500 26px Fredoka, Trebuchet MS, sans-serif";
  ctx.fillText(subtitle, W / 2, H / 2 + 26);

  if (state === "over") {
    ctx.font = "500 22px Fredoka, Trebuchet MS, sans-serif";
    ctx.fillText("You scored " + Math.floor(score), W / 2, H / 2 + 66);
  }
}

// ---------- 8. The game loop ----------
let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);  // seconds since last frame
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);   // ask the browser to run this again
}

requestAnimationFrame(loop);
