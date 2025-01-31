// Configuration object
const config = {
  TILE_SIZE: 32,
  WORLD_SIZE: 250,
  PLAYER_SIZE: 32,
  PLAYER_SPEED: 5,
  CAMERA_LERP: 0.05,
  ZOOM_LEVEL: 2,
  WATER_CHANCE: 0.005,
  WATER_CHUNK_RADIUS: 3,
  SPRITE_SCALE: 1,
};

// Tile colors for the minimap
const tileColors = {
  0: "#4CAF50", // Grass
  1: "#2196F3", // Water
};

// Minimap configuration
const minimapConfig = {
  width: 200, // Width of the minimap in pixels
  height: 200, // Height of the minimap in pixels
  scale: config.WORLD_SIZE / 200, // Scale factor (1 tile = 1 pixel)
  offsetX: 20, // Offset from the right edge of the screen
  offsetY: 20, // Offset from the top edge of the screen
};

// Canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Offscreen canvas for minimap
const minimapCanvas = document.createElement("canvas");
minimapCanvas.width = minimapConfig.width;
minimapCanvas.height = minimapConfig.height;
const minimapCtx = minimapCanvas.getContext("2d");

// Disable anti-aliasing
ctx.imageSmoothingEnabled = false;
minimapCtx.imageSmoothingEnabled = false;

// Sprite loading system
const sprites = {
  grass: new Image(),
  water: new Image(),
  player: new Image(),
};

let loadedImages = 0;
function checkAllLoaded() {
  loadedImages++;
  if (loadedImages === Object.keys(sprites).length) {
    // All images loaded, start game
    generateTerrain();
    gameLoop(); // Ensure gameLoop is defined before this is called
  }
}

// Load sprites
sprites.grass.src = "assets/sprites/terrain/grass.png";
sprites.grass.onload = checkAllLoaded;
sprites.water.src = "assets/sprites/terrain/water.png";
sprites.water.onload = checkAllLoaded;
sprites.player.src = "assets/sprites/player/player.png";
sprites.player.onload = checkAllLoaded;

// Game state
let tiles = [];
let player = {
  x: (config.WORLD_SIZE * config.TILE_SIZE) / 2,
  y: (config.WORLD_SIZE * config.TILE_SIZE) / 2,
  targetX: null,
  targetY: null,
};

let camera = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

// Mouse state tracking
let isMouseDown = false;
let mouseWorldX = 0;
let mouseWorldY = 0;

// Resize canvas
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.width = canvas.width / config.ZOOM_LEVEL;
  camera.height = canvas.height / config.ZOOM_LEVEL;
}
window.addEventListener("resize", resize);
resize();

// Generate terrain
function generateTerrain() {
  tiles = Array(config.WORLD_SIZE)
    .fill()
    .map(() => Array(config.WORLD_SIZE).fill(0));

  for (let y = 0; y < config.WORLD_SIZE; y++) {
    for (let x = 0; x < config.WORLD_SIZE; x++) {
      if (Math.random() < config.WATER_CHANCE) {
        const radius = Math.floor(Math.random() * config.WATER_CHUNK_RADIUS) + 1;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < config.WORLD_SIZE && ny >= 0 && ny < config.WORLD_SIZE) {
              tiles[ny][nx] = 1;
            }
          }
        }
      }
    }
  }

  // Pre-render the minimap
  renderMinimap();
}

// Pre-render the minimap
function renderMinimap() {
  minimapCtx.fillStyle = "#000000";
  minimapCtx.fillRect(0, 0, minimapConfig.width, minimapConfig.height);

  for (let y = 0; y < config.WORLD_SIZE; y++) {
    for (let x = 0; x < config.WORLD_SIZE; x++) {
      const tileType = tiles[y][x];
      const color = tileColors[tileType];
      minimapCtx.fillStyle = color;

      const pixelX = Math.floor(x / minimapConfig.scale);
      const pixelY = Math.floor(y / minimapConfig.scale);
      minimapCtx.fillRect(pixelX, pixelY, 1, 1);
    }
  }
}

// Draw the minimap
function drawMinimap() {
  const minimapX = canvas.width - minimapConfig.width - minimapConfig.offsetX;
  const minimapY = minimapConfig.offsetY;

  // Draw the pre-rendered minimap
  ctx.drawImage(minimapCanvas, minimapX, minimapY);

  // Draw the player on the minimap
  const playerMinimapX = minimapX + Math.floor(player.x / (config.TILE_SIZE * minimapConfig.scale));
  const playerMinimapY = minimapY + Math.floor(player.y / (config.TILE_SIZE * minimapConfig.scale));
  ctx.fillStyle = "#FF0000"; // Player color
  ctx.fillRect(playerMinimapX, playerMinimapY, 2, 2); // Slightly larger to make it visible
}

// Convert world coordinates to screen coordinates
function worldToScreen(x, y) {
  return {
    x: (x - camera.x) * config.ZOOM_LEVEL,
    y: (y - camera.y) * config.ZOOM_LEVEL,
  };
}

// Convert screen coordinates to world coordinates
function screenToWorld(x, y) {
  return {
    x: x / config.ZOOM_LEVEL + camera.x,
    y: y / config.ZOOM_LEVEL + camera.y,
  };
}

// Mouse event listeners
canvas.addEventListener("mousedown", (e) => {
  isMouseDown = true;
  updateMousePosition(e);
});

canvas.addEventListener("mouseup", () => {
  isMouseDown = false;
});

canvas.addEventListener("mousemove", (e) => {
  updateMousePosition(e);
});

// Update mouse position in world coordinates
function updateMousePosition(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  const worldPos = screenToWorld(clickX, clickY);
  mouseWorldX = worldPos.x;
  mouseWorldY = worldPos.y;
}

// Simulate clicks every 0.2 seconds while mouse is held down
function checkMouseHold() {
  if (isMouseDown) {
    player.targetX = mouseWorldX;
    player.targetY = mouseWorldY;
  }
}

setInterval(checkMouseHold, 200);

// Update game state
function update() {
  if (player.targetX !== null && player.targetY !== null) {
    const dx = player.targetX - player.x;
    const dy = player.targetY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > config.PLAYER_SPEED) {
      player.x += (dx / distance) * config.PLAYER_SPEED;
      player.y += (dy / distance) * config.PLAYER_SPEED;
    } else {
      player.x = player.targetX;
      player.y = player.targetY;
      player.targetX = null;
      player.targetY = null;
    }
  }

  camera.x += (player.x - camera.x - camera.width / 2) * config.CAMERA_LERP;
  camera.y += (player.y - camera.y - camera.height / 2) * config.CAMERA_LERP;
}

// Draw the game
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(config.ZOOM_LEVEL, config.ZOOM_LEVEL);

  // Align the camera to whole pixels to prevent sub-pixel rendering
  const alignedCameraX = Math.floor(camera.x);
  const alignedCameraY = Math.floor(camera.y);
  ctx.translate(-alignedCameraX, -alignedCameraY);

  const startX = Math.max(0, Math.floor(alignedCameraX / config.TILE_SIZE));
  const startY = Math.max(0, Math.floor(alignedCameraY / config.TILE_SIZE));
  const endX = Math.min(config.WORLD_SIZE, Math.ceil((alignedCameraX + camera.width) / config.TILE_SIZE));
  const endY = Math.min(config.WORLD_SIZE, Math.ceil((alignedCameraY + camera.height) / config.TILE_SIZE));

  // Draw terrain sprites
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const sprite = tiles[y][x] === 1 ? sprites.water : sprites.grass;
      ctx.drawImage(sprite, x * config.TILE_SIZE, y * config.TILE_SIZE, config.TILE_SIZE, config.TILE_SIZE);
    }
  }

  // Draw player sprite
  ctx.drawImage(
    sprites.player,
    Math.floor(player.x - config.PLAYER_SIZE / 2),
    Math.floor(player.y - config.PLAYER_SIZE / 2),
    config.PLAYER_SIZE,
    config.PLAYER_SIZE
  );

  ctx.restore();

  // Draw the minimap
  drawMinimap();
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
