/**
 * NARUTO STICKMAN - ARENA FIGHTER
 * Complete game implementation in a single script
 */

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    GRAVITY: 0.6,
    FRICTION: 0.85,
    AIR_FRICTION: 0.95,
    WALK_SPEED: 5,
    RUN_SPEED: 8,
    DASH_SPEED: 15,
    JUMP_POWER: 12,
    MAX_FALL_SPEED: 15,
    BASE_DAMAGE: 10,
    BASE_KNOCKBACK: 5,
    COMBO_WINDOW: 500,
    MAX_HP: 100,
    MAX_CHAKRA: 100,
    CHAKRA_REGEN: 0.5,
    CHAKRA_REGEN_DELAY: 300,
    ARENA_PADDING: 50,
    CAMERA_FOLLOW_SPEED: 8,
    GAME_STATES: {
        MENU: 'menu',
        BATTLE: 'battle',
        VICTORY: 'victory',
        PAUSE: 'pause'
    },
    CHARACTER_STATES: {
        IDLE: 'idle',
        WALKING: 'walking',
        RUNNING: 'running',
        JUMPING: 'jumping',
        FALLING: 'falling',
        ATTACKING: 'attacking',
        DEFENDING: 'defending',
        HIT: 'hit',
        KNOCKED_BACK: 'knocked_back',
        KO: 'ko'
    }
};

const COMBAT = {
    ATTACK_COOLDOWN: 300,
    ATTACK_RANGE: 50,
    ATTACK_DAMAGE: 10,
    ATTACK_KNOCKBACK_X: 8,
    ATTACK_KNOCKBACK_Y: 2,
};

// ============================================================================
// AUDIO MANAGER
// ============================================================================

class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.soundVolume = 0.3;
        this.musicVolume = 0.2;
        this.muted = false;
    }

    playBeep(frequency = 440, duration = 100, volume = 0.3) {
        if (this.muted) return;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration / 1000);
    }

    playAttack() { this.playBeep(200, 50, this.soundVolume); }
    playHit() { this.playBeep(150, 100, this.soundVolume); }
    playDefense() { this.playBeep(300, 50, this.soundVolume); }
    playJump() { this.playBeep(400, 80, this.soundVolume); }
    playVictory() {
        const notes = [523, 659, 784];
        let delay = 0;
        notes.forEach((freq) => {
            setTimeout(() => this.playBeep(freq, 200, this.soundVolume), delay);
            delay += 150;
        });
    }
    playKO() { this.playBeep(100, 500, this.soundVolume); }
    toggleMute() { this.muted = !this.muted; return this.muted; }
}

const audioManager = new AudioManager();

// ============================================================================
// CHARACTER CLASS
// ============================================================================

class Character {
    constructor(x, y, isPlayer1 = true) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.isPlayer1 = isPlayer1;
        this.direction = isPlayer1 ? 1 : -1;
        
        this.maxHP = CONFIG.MAX_HP;
        this.hp = CONFIG.MAX_HP;
        this.maxChakra = CONFIG.MAX_CHAKRA;
        this.chakra = CONFIG.MAX_CHAKRA;
        
        this.speed = 1.0;
        this.damage = 1.0;
        this.defense = 1.0;
        
        this.state = CONFIG.CHARACTER_STATES.IDLE;
        this.isGrounded = false;
        this.isJumping = false;
        this.isDashing = false;
        this.isDefending = false;
        this.isAttacking = false;
        
        this.lastAttackTime = 0;
        this.comboCounter = 0;
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.isKnockedBack = false;
        
        this.lastChakraRegenTime = 0;
        this.width = 30;
        this.height = 60;
        this.color = isPlayer1 ? '#ff6b6b' : '#4ecdc4';
        
        this.animationFrame = 0;
        this.animationSpeed = 5;
    }

    update(input = null) {
        if (!this.isGrounded) {
            this.vy += CONFIG.GRAVITY;
            if (this.vy > CONFIG.MAX_FALL_SPEED) {
                this.vy = CONFIG.MAX_FALL_SPEED;
            }
        }

        if (this.isKnockedBack) {
            this.vx = this.knockbackVx;
            this.vy = this.knockbackVy;
            this.knockbackVx *= 0.9;
            this.knockbackVy *= 0.9;
            if (Math.abs(this.knockbackVx) < 0.5 && Math.abs(this.knockbackVy) < 0.5) {
                this.isKnockedBack = false;
            }
        } else if (input) {
            this.handleInput(input);
        }

        const friction = this.isGrounded ? CONFIG.FRICTION : CONFIG.AIR_FRICTION;
        if (!this.isKnockedBack) {
            this.vx *= friction;
        }

        this.x += this.vx;
        this.y += this.vy;

        const arenaLeft = CONFIG.ARENA_PADDING;
        const arenaRight = CONFIG.CANVAS_WIDTH - CONFIG.ARENA_PADDING - this.width;

        if (this.x < arenaLeft) { this.x = arenaLeft; this.vx = 0; }
        if (this.x > arenaRight) { this.x = arenaRight; this.vx = 0; }

        const groundY = CONFIG.CANVAS_HEIGHT - this.height - 20;
        if (this.y >= groundY) {
            this.y = groundY;
            this.vy = 0;
            this.isGrounded = true;
            this.isJumping = false;
            if (this.state === CONFIG.CHARACTER_STATES.FALLING) {
                this.state = CONFIG.CHARACTER_STATES.IDLE;
            }
        } else {
            this.isGrounded = false;
            if (this.state === CONFIG.CHARACTER_STATES.IDLE || this.state === CONFIG.CHARACTER_STATES.WALKING || this.state === CONFIG.CHARACTER_STATES.RUNNING) {
                this.state = CONFIG.CHARACTER_STATES.FALLING;
            }
        }

        this.updateChakra();
        this.animationFrame++;
        if (this.animationFrame > this.animationSpeed) {
            this.animationFrame = 0;
        }
    }

    handleInput(input) {
        let moving = false;
        if (input.left) {
            this.direction = -1;
            this.vx = -CONFIG.WALK_SPEED * this.speed;
            this.state = CONFIG.CHARACTER_STATES.WALKING;
            moving = true;
        } else if (input.right) {
            this.direction = 1;
            this.vx = CONFIG.WALK_SPEED * this.speed;
            this.state = CONFIG.CHARACTER_STATES.WALKING;
            moving = true;
        }
        if (input.dash && this.isGrounded && !this.isDashing) {
            this.isDashing = true;
            this.vx = CONFIG.DASH_SPEED * this.direction * this.speed;
            setTimeout(() => { this.isDashing = false; }, 300);
        }
        if (input.jump && this.isGrounded && !this.isJumping) {
            this.vy = -CONFIG.JUMP_POWER;
            this.isJumping = true;
            this.isGrounded = false;
            this.state = CONFIG.CHARACTER_STATES.JUMPING;
            audioManager.playJump();
        }
        if (input.attack) this.attack();
        if (input.defend) this.defend();
        else this.stopDefending();
        if (!moving && this.isGrounded && !this.isAttacking && !this.isDefending) {
            this.state = CONFIG.CHARACTER_STATES.IDLE;
            this.vx = 0;
        }
    }

    attack() {
        if (!this.isGrounded && !this.isAttacking) return;
        const now = Date.now();
        if (now - this.lastAttackTime > COMBAT.ATTACK_COOLDOWN) {
            this.isAttacking = true;
            this.state = CONFIG.CHARACTER_STATES.ATTACKING;
            this.lastAttackTime = now;
            audioManager.playAttack();
            setTimeout(() => {
                if (this.isGrounded) {
                    this.isAttacking = false;
                    this.state = CONFIG.CHARACTER_STATES.IDLE;
                }
            }, 200);
        }
    }

    defend() {
        this.isDefending = true;
        this.state = CONFIG.CHARACTER_STATES.DEFENDING;
        this.vx *= 0.5;
        audioManager.playDefense();
    }

    stopDefending() {
        this.isDefending = false;
        if (this.isGrounded && this.state === CONFIG.CHARACTER_STATES.DEFENDING) {
            this.state = CONFIG.CHARACTER_STATES.IDLE;
        }
    }

    takeDamage(damage, knockbackVx = 0, knockbackVy = 0) {
        const mitigatedDamage = this.isDefending ? damage * 0.5 : damage;
        this.hp -= mitigatedDamage;
        audioManager.playHit();
        if (this.hp < 0) {
            this.hp = 0;
            this.state = CONFIG.CHARACTER_STATES.KO;
            audioManager.playKO();
        } else {
            this.state = CONFIG.CHARACTER_STATES.HIT;
            this.isKnockedBack = true;
            this.knockbackVx = knockbackVx;
            this.knockbackVy = knockbackVy;
            setTimeout(() => {
                if (this.state === CONFIG.CHARACTER_STATES.HIT) {
                    this.state = this.isGrounded ? CONFIG.CHARACTER_STATES.IDLE : CONFIG.CHARACTER_STATES.FALLING;
                }
            }, 300);
        }
    }

    updateChakra() {
        const now = Date.now();
        if (this.chakra < this.maxChakra) {
            if (now - this.lastChakraRegenTime > CONFIG.CHAKRA_REGEN_DELAY) {
                this.chakra += CONFIG.CHAKRA_REGEN;
                if (this.chakra > this.maxChakra) {
                    this.chakra = this.maxChakra;
                }
            }
        }
        this.lastChakraRegenTime = now;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y);
        if (this.direction === -1) ctx.scale(-1, 1);

        // Head
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillRect(-5, 18, 10, 20);

        // Arms
        ctx.fillRect(-15, 20, 10, 5);
        ctx.fillRect(5, 20, 10, 5);

        // Legs
        ctx.fillRect(-5, 38, 5, 15);
        ctx.fillRect(0, 38, 5, 15);

        // Defense indicator
        if (this.isDefending) {
            ctx.strokeStyle = '#4ecdc4';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 20, 20, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Hit indicator
        if (this.state === CONFIG.CHARACTER_STATES.HIT) {
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(10, 5);
            ctx.moveTo(10, -5);
            ctx.lineTo(-10, 5);
            ctx.stroke();
        }

        ctx.restore();
    }

    isKO() { return this.hp <= 0; }
    getHPPercentage() { return (this.hp / this.maxHP) * 100; }
    getChakraPercentage() { return (this.chakra / this.maxChakra) * 100; }
    reset() {
        this.hp = this.maxHP;
        this.chakra = this.maxChakra;
        this.vx = 0;
        this.vy = 0;
        this.state = CONFIG.CHARACTER_STATES.IDLE;
        this.isGrounded = false;
        this.isAttacking = false;
        this.isDefending = false;
        this.isKnockedBack = false;
        this.comboCounter = 0;
        this.lastAttackTime = 0;
    }
}

// ============================================================================
// GAME ENGINE
// ============================================================================

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;

        this.gameState = CONFIG.GAME_STATES.MENU;
        this.round = 1;
        this.roundTime = 60;
        this.roundStartTime = 0;

        this.player1 = null;
        this.player2 = null;

        this.player1Input = {};
        this.player2Input = {};

        this.cameraX = 0;
        this.cameraY = 0;

        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        document.getElementById('play-btn').addEventListener('click', () => this.startBattle());
        document.getElementById('rematch-btn').addEventListener('click', () => this.startBattle());
        document.getElementById('menu-btn').addEventListener('click', () => this.goToMenu());

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        window.addEventListener('resize', () => this.handleResize());
    }

    startBattle() {
        const startX1 = CONFIG.CANVAS_WIDTH / 4;
        const startX2 = (CONFIG.CANVAS_WIDTH * 3) / 4;
        const startY = CONFIG.CANVAS_HEIGHT - 100;

        this.player1 = new Character(startX1, startY, true);
        this.player2 = new Character(startX2, startY, false);

        this.round = 1;
        this.roundTime = 60;
        this.roundStartTime = Date.now();

        this.gameState = CONFIG.GAME_STATES.BATTLE;
        this.showScreen('game-container');
    }

    update() {
        if (this.gameState !== CONFIG.GAME_STATES.BATTLE) return;

        this.player1.update(this.player1Input);
        this.player2.update(this.player2Input);

        this.checkCombat();

        const elapsedSeconds = Math.floor((Date.now() - this.roundStartTime) / 1000);
        this.roundTime = Math.max(0, 60 - elapsedSeconds);

        if (this.player1.isKO() || this.player2.isKO() || this.roundTime === 0) {
            this.endBattle();
        }

        this.updateCamera();
    }

    checkCombat() {
        if (this.player1.isAttacking) {
            const distance = Math.abs(this.player1.x - this.player2.x);
            if (distance < COMBAT.ATTACK_RANGE) {
                const knockbackDirection = this.player1.direction;
                this.player2.takeDamage(
                    COMBAT.ATTACK_DAMAGE,
                    COMBAT.ATTACK_KNOCKBACK_X * knockbackDirection,
                    COMBAT.ATTACK_KNOCKBACK_Y
                );
                this.player1.isAttacking = false;
            }
        }

        if (this.player2.isAttacking) {
            const distance = Math.abs(this.player2.x - this.player1.x);
            if (distance < COMBAT.ATTACK_RANGE) {
                const knockbackDirection = this.player2.direction;
                this.player1.takeDamage(
                    COMBAT.ATTACK_DAMAGE,
                    COMBAT.ATTACK_KNOCKBACK_X * knockbackDirection,
                    COMBAT.ATTACK_KNOCKBACK_Y
                );
                this.player2.isAttacking = false;
            }
        }
    }

    updateCamera() {
        const centerX = (this.player1.x + this.player2.x) / 2;
        const centerY = (this.player1.y + this.player2.y) / 2;
        const targetCameraX = centerX - CONFIG.CANVAS_WIDTH / 2;
        const targetCameraY = centerY - CONFIG.CANVAS_HEIGHT / 2;
        this.cameraX += (targetCameraX - this.cameraX) / CONFIG.CAMERA_FOLLOW_SPEED;
        this.cameraY += (targetCameraY - this.cameraY) / CONFIG.CAMERA_FOLLOW_SPEED;
    }

    draw() {
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);

        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - 20, CONFIG.CANVAS_WIDTH, 20);

        this.player1.draw(this.ctx);
        this.player2.draw(this.ctx);

        this.ctx.restore();

        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('p1-hp').style.width = this.player1.getHPPercentage() + '%';
        document.getElementById('p1-hp-value').textContent = Math.ceil(this.player1.hp);
        document.getElementById('p2-hp').style.width = this.player2.getHPPercentage() + '%';
        document.getElementById('p2-hp-value').textContent = Math.ceil(this.player2.hp);
        document.getElementById('p1-chakra').style.width = this.player1.getChakraPercentage() + '%';
        document.getElementById('p2-chakra').style.width = this.player2.getChakraPercentage() + '%';
        document.getElementById('timer').textContent = this.roundTime;
    }

    endBattle() {
        this.gameState = CONFIG.GAME_STATES.VICTORY;
        let winner = '';
        if (this.player1.isKO()) {
            winner = 'Player 2 Wins!';
        } else if (this.player2.isKO()) {
            winner = 'Player 1 Wins!';
        } else {
            winner = this.player1.hp > this.player2.hp ? 'Player 1 Wins!' : 'Player 2 Wins!';
        }
        document.getElementById('winner-text').textContent = winner;
        audioManager.playVictory();
        this.showScreen('victory-container');
    }

    goToMenu() {
        this.gameState = CONFIG.GAME_STATES.MENU;
        this.showScreen('menu-container');
    }

    handleKeyDown(e) {
        if (e.key === 'w' || e.key === 'W') this.player1Input.jump = true;
        if (e.key === 'a' || e.key === 'A') this.player1Input.left = true;
        if (e.key === 'd' || e.key === 'D') this.player1Input.right = true;
        if (e.key === ' ') this.player1Input.attack = true;
        if (e.key === 's' || e.key === 'S') this.player1Input.defend = true;
        if (e.key === 'Shift') this.player1Input.dash = true;

        if (e.key === 'ArrowUp') this.player2Input.jump = true;
        if (e.key === 'ArrowLeft') this.player2Input.left = true;
        if (e.key === 'ArrowRight') this.player2Input.right = true;
        if (e.key === 'Enter') this.player2Input.attack = true;
        if (e.key === 'ArrowDown') this.player2Input.defend = true;
        if (e.key === '/') this.player2Input.dash = true;
    }

    handleKeyUp(e) {
        if (e.key === 'w' || e.key === 'W') this.player1Input.jump = false;
        if (e.key === 'a' || e.key === 'A') this.player1Input.left = false;
        if (e.key === 'd' || e.key === 'D') this.player1Input.right = false;
        if (e.key === ' ') this.player1Input.attack = false;
        if (e.key === 's' || e.key === 'S') this.player1Input.defend = false;
        if (e.key === 'Shift') this.player1Input.dash = false;

        if (e.key === 'ArrowUp') this.player2Input.jump = false;
        if (e.key === 'ArrowLeft') this.player2Input.left = false;
        if (e.key === 'ArrowRight') this.player2Input.right = false;
        if (e.key === 'Enter') this.player2Input.attack = false;
        if (e.key === 'ArrowDown') this.player2Input.defend = false;
        if (e.key === '/') this.player2Input.dash = false;
    }

    handleResize() {
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach((screen) => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Fullscreen error: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    if (e.key === 'm' || e.key === 'M') {
        const muted = audioManager.toggleMute();
        console.log(muted ? 'Muted' : 'Unmuted');
    }
});

window.addEventListener('resize', () => {
    CONFIG.CANVAS_WIDTH = window.innerWidth;
    CONFIG.CANVAS_HEIGHT = window.innerHeight;
});
