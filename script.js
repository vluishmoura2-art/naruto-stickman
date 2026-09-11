/**
 * NARUTO STICKMAN - ARENA FIGHTER
 * Game Loop + Canvas Implementation
 * 
 * OBJECTIVE:
 * - Create basic game structure with Canvas
 * - Implement continuous game loop
 * - Display arena with floor
 * - Render single stickman character
 */

// ============================================================================
// CANVAS SETUP
// ============================================================================

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Set canvas size to fill the screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Initial resize
resizeCanvas();

// Resize canvas when window is resized
window.addEventListener('resize', resizeCanvas);

// ============================================================================
// GAME CONFIGURATION
// ============================================================================

const GAME = {
    width: canvas.width,
    height: canvas.height,
    running: true,
    frameCount: 0,
    fps: 0,
    lastTime: Date.now(),
};

const ARENA = {
    width: canvas.width,
    height: canvas.height,
    padding: 50,
    // Ground level
    groundY: canvas.height - 80,
};

const STICKMAN = {
    x: canvas.width / 2,
    y: ARENA.groundY - 60,
    width: 30,
    height: 60,
    color: '#ff6b6b',
};

// ============================================================================
// STICKMAN CLASS
// ============================================================================

class Stickman {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 60;
        this.color = '#ff6b6b';
        this.vx = 0;
        this.vy = 0;
    }

    /**
     * Draw stickman on canvas
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Head
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillRect(-5, 18, 10, 20);

        // Arms (extended)
        ctx.fillRect(-18, 20, 18, 5);
        ctx.fillRect(0, 20, 18, 5);

        // Legs
        ctx.fillRect(-5, 38, 5, 18);
        ctx.fillRect(0, 38, 5, 18);

        ctx.restore();
    }
}

// Create player stickman
const player = new Stickman(
    ARENA.width / 2,
    ARENA.groundY - STICKMAN.height
);

// ============================================================================
// DRAWING FUNCTIONS
// ============================================================================

/**
 * Draw the arena background
 */
function drawBackground() {
    // Sky
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, GAME.width, ARENA.groundY);

    // Gradient sky effect
    const gradient = ctx.createLinearGradient(0, 0, 0, ARENA.groundY);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(0.5, '#b0e0e6');
    gradient.addColorStop(1, '#e0f6ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME.width, ARENA.groundY);
}

/**
 * Draw the ground/floor
 */
function drawGround() {
    const groundY = ARENA.groundY;
    const groundHeight = GAME.height - groundY;

    // Main ground
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(0, groundY, GAME.width, groundHeight);

    // Ground details
    ctx.fillStyle = '#A0826D';
    ctx.fillRect(0, groundY, GAME.width, 5);

    // Grid pattern for visual interest
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < GAME.width; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i, groundY);
        ctx.lineTo(i, GAME.height);
        ctx.stroke();
    }

    // Arena boundaries
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(
        ARENA.padding,
        ARENA.padding,
        GAME.width - ARENA.padding * 2,
        groundY - ARENA.padding - 20
    );
}

/**
 * Draw all game elements
 */
function draw() {
    // Clear canvas with background
    drawBackground();

    // Draw ground
    drawGround();

    // Draw stickman
    player.draw(ctx);

    // Draw FPS counter (optional debug info)
    drawDebugInfo();
}

/**
 * Draw debug information (FPS counter)
 */
function drawDebugInfo() {
    // FPS in top-right corner
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${GAME.fps}`, GAME.width - 10, 20);
}

// ============================================================================
// UPDATE FUNCTIONS
// ============================================================================

/**
 * Update game state
 */
function update() {
    // Placeholder for future updates (movement, collision, etc.)
}

// ============================================================================
// GAME LOOP
// ============================================================================

let lastTimestamp = 0;
let frameCounter = 0;
let fpsUpdateTime = 0;

/**
 * Main game loop using requestAnimationFrame
 */
function gameLoop(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = (timestamp - lastTimestamp) / 1000; // Convert to seconds
    lastTimestamp = timestamp;

    // Update FPS counter every 500ms
    frameCounter++;
    if (timestamp - fpsUpdateTime > 500) {
        GAME.fps = Math.round(frameCounter * 1000 / (timestamp - fpsUpdateTime));
        frameCounter = 0;
        fpsUpdateTime = timestamp;
    }

    // Game loop steps
    update();       // Update game state
    draw();         // Draw everything

    // Continue the loop
    requestAnimationFrame(gameLoop);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the game
 */
function init() {
    console.log('🎮 Naruto Stickman - Arena Fighter');
    console.log('Canvas Size:', GAME.width, 'x', GAME.height);
    console.log('Ground Level:', ARENA.groundY);
    console.log('Stickman Position:', player.x, player.y);

    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
    }, 500);

    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Start game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ============================================================================
// KEYBOARD INPUT (Placeholder for future use)
// ============================================================================

const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get canvas center coordinates
 */
function getCanvasCenter() {
    return {
        x: GAME.width / 2,
        y: GAME.height / 2,
    };
}

/**
 * Toggle FPS counter display
 */
function toggleFPSCounter() {
    const fpsCounter = document.getElementById('fps-counter');
    fpsCounter.style.display = fpsCounter.style.display === 'none' ? 'block' : 'none';
}

/**
 * Log game info to console
 */
function logGameInfo() {
    console.log({
        canvasSize: `${GAME.width}x${GAME.height}`,
        fps: GAME.fps,
        playerPosition: { x: player.x, y: player.y },
        arenaGroundLevel: ARENA.groundY,
    });
}

// Keyboard shortcut to toggle FPS display (Press F1)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
        e.preventDefault();
        toggleFPSCounter();
    }
    if (e.key === 'F2') {
        e.preventDefault();
        logGameInfo();
    }
});
