/**
 * NARUTO STICKMAN - ARENA FIGHTER
 * Player + Movement System
 * 
 * OBJECTIVE:
 * - Create a playable character with physics
 * - Implement horizontal movement (A/D, arrows)
 * - Implement jump mechanics (W, up arrow, space)
 * - Apply gravity and ground detection
 * - Render player stickman with direction awareness
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

const PHYSICS = {
    gravity: 0.6,
    friction: 0.85,
    maxFallSpeed: 15,
};

// ============================================================================
// PLAYER CLASS
// ============================================================================

class Player {
    constructor(x, y) {
        // Position
        this.x = x;
        this.y = y;

        // Dimensions
        this.width = 30;
        this.height = 60;

        // Velocity
        this.velocityX = 0;
        this.velocityY = 0;

        // Physics
        this.speed = 5;          // Horizontal movement speed
        this.jumpForce = 12;     // Jump strength
        this.gravity = PHYSICS.gravity;

        // State
        this.grounded = false;
        this.isJumping = false;
        this.direction = 1;     // 1 = right, -1 = left

        // Visual
        this.color = '#ff6b6b';
    }

    /**
     * Handle input from keyboard
     */
    handleInput(keys) {
        // Horizontal movement
        if (keys['a'] || keys['arrowleft']) {
            this.velocityX = -this.speed;
            this.direction = -1;
        } else if (keys['d'] || keys['arrowright']) {
            this.velocityX = this.speed;
            this.direction = 1;
        } else {
            // Stop when no key is pressed
            this.velocityX = 0;
        }

        // Jump - only when grounded
        if ((keys['w'] || keys['arrowup'] || keys[' ']) && this.grounded && !this.isJumping) {
            this.velocityY = -this.jumpForce;
            this.isJumping = true;
            this.grounded = false;
        }
    }

    /**
     * Update player state (physics)
     */
    update() {
        // Apply gravity
        if (!this.grounded) {
            this.velocityY += this.gravity;

            // Cap fall speed
            if (this.velocityY > PHYSICS.maxFallSpeed) {
                this.velocityY = PHYSICS.maxFallSpeed;
            }
        }

        // Apply velocity to position
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Arena boundary collision (left and right)
        const minX = ARENA.padding;
        const maxX = ARENA.width - ARENA.padding - this.width;

        if (this.x < minX) {
            this.x = minX;
            this.velocityX = 0;
        }
        if (this.x > maxX) {
            this.x = maxX;
            this.velocityX = 0;
        }

        // Ground collision
        const groundY = ARENA.groundY;
        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.velocityY = 0;
            this.grounded = true;
            this.isJumping = false;
        } else {
            this.grounded = false;
        }
    }

    /**
     * Draw player stickman on canvas
     */
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y);

        // Flip character if facing left
        if (this.direction === -1) {
            ctx.scale(-1, 1);
        }

        // Head
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillRect(-5, 18, 10, 20);

        // Arms
        const armLength = this.isJumping ? 10 : 18;
        const armOffsetY = this.isJumping ? 18 : 20;
        ctx.fillRect(-armLength, armOffsetY, armLength, 5);
        ctx.fillRect(0, armOffsetY, armLength, 5);

        // Legs
        ctx.fillRect(-5, 38, 5, 18);
        ctx.fillRect(0, 38, 5, 18);

        ctx.restore();
    }

    /**
     * Get current state for debugging
     */
    getState() {
        return {
            position: { x: Math.round(this.x), y: Math.round(this.y) },
            velocity: { x: this.velocityX.toFixed(2), y: this.velocityY.toFixed(2) },
            grounded: this.grounded,
            isJumping: this.isJumping,
            direction: this.direction === 1 ? 'right' : 'left',
        };
    }
}

// Create player
const player = new Player(
    ARENA.width / 2 - 15,
    ARENA.groundY - 60
);

// ============================================================================
// INPUT HANDLING
// ============================================================================

const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// ============================================================================
// DRAWING FUNCTIONS
// ============================================================================

/**
 * Draw the arena background
 */
function drawBackground() {
    // Gradient sky
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

    // Ground highlight
    ctx.fillStyle = '#A0826D';
    ctx.fillRect(0, groundY, GAME.width, 5);

    // Grid pattern
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

    // Draw player
    player.draw(ctx);

    // Draw debug info
    drawDebugInfo();
}

/**
 * Draw debug information
 */
function drawDebugInfo() {
    // FPS counter
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${GAME.fps}`, GAME.width - 10, 20);

    // Player state
    const state = player.getState();
    ctx.fillStyle = '#00ff00';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'left';

    let debugY = 20;
    ctx.fillText(`X: ${state.position.x}`, 10, debugY);
    debugY += 14;
    ctx.fillText(`Y: ${state.position.y}`, 10, debugY);
    debugY += 14;
    ctx.fillText(`VX: ${state.velocity.x}`, 10, debugY);
    debugY += 14;
    ctx.fillText(`VY: ${state.velocity.y}`, 10, debugY);
    debugY += 14;
    ctx.fillText(`Grounded: ${state.grounded}`, 10, debugY);
    debugY += 14;
    ctx.fillText(`Jumping: ${state.isJumping}`, 10, debugY);
    debugY += 14;
    ctx.fillText(`Direction: ${state.direction}`, 10, debugY);

    // Controls info
    ctx.fillStyle = '#ffff00';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('A/D or ← → : Move | W/↑/Space : Jump | F1: Toggle Debug', GAME.width / 2, GAME.height - 10);
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
    lastTimestamp = timestamp;

    // Update FPS counter every 500ms
    frameCounter++;
    if (timestamp - fpsUpdateTime > 500) {
        GAME.fps = Math.round(frameCounter * 1000 / (timestamp - fpsUpdateTime));
        frameCounter = 0;
        fpsUpdateTime = timestamp;
    }

    // Game loop steps
    player.handleInput(keys);  // Process input
    player.update();            // Update physics
    draw();                      // Render everything

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
    console.log('Player Position:', player.x, player.y);
    console.log('Controls: A/D or ← → to move, W/↑/Space to jump');

    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
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
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Toggle debug display
 */
function toggleDebug() {
    const canvas = document.getElementById('game-canvas');
    canvas.dataset.debugMode = canvas.dataset.debugMode === 'true' ? 'false' : 'true';
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
        e.preventDefault();
        toggleDebug();
        console.log('Debug mode toggled');
    }
    if (e.key === 'F2') {
        e.preventDefault();
        console.log('Player State:', player.getState());
    }
});
