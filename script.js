const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Refs
const hudLevel = document.getElementById('hud-level');
const hudDeaths = document.getElementById('hud-deaths');
const msgOverlay = document.getElementById('msg-overlay');
const msgMain = document.getElementById('msg-main');
const msgSub = document.getElementById('msg-sub');
const menuScreen = document.getElementById('menu-screen');
const victoryScreen = document.getElementById('victory-screen');
const finalStats = document.getElementById('final-stats');

// Game State
let state = 'MENU'; // MENU, PLAYING, VICTORY
let level = 0;
let deaths = 0;
let isDead = false;
let shakeIntensity = 0;

// Inputs
const keys = { ArrowUp:false, ArrowLeft:false, ArrowRight:false, ' ':false, w:false, a:false, d:false };

window.addEventListener('keydown', (e) => {
    if(keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key] = true;
        if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => {
    if(keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) keys[e.key] = false;
});

const bindTouch = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', (e) => { e.preventDefault(); keys[key] = true; });
    el.addEventListener('touchend', (e) => { e.preventDefault(); keys[key] = false; });
};
bindTouch('btn-left', 'ArrowLeft');
bindTouch('btn-right', 'ArrowRight');
bindTouch('btn-jump', 'ArrowUp');

/* --- GAME OBJECTS --- */
const player = {
    x: 50, y: 300, w: 20, h: 20,
    vx: 0, vy: 0,
    speed: 0.9, maxSpeed: 6.5, friction: 0.82, airResistance: 0.94,
    gravity: 0.6, jumpPower: -12.5, grounded: false,
    trail: []
};

let walls = [];
let hazards = [];
let goal = { x: 0, y: 0, w: 30, h: 30 };
let particles = [];
let tutorialText = [];

/* --- LEVELS --- */
function loadLevel(lvl) {
    player.vx = 0; player.vy = 0;
    player.grounded = false;
    player.trail = [];
    walls = [];
    hazards = [];
    tutorialText = [];

    // Common floor for most levels (can be overridden)
    const floor = {x: 0, y: 350, w: 600, h: 50};

    if (lvl === 0) { // Tutorial
        player.x = 50; player.y = 300;
        goal = { x: 520, y: 250, w: 30, h: 30 };
        walls.push(floor);
        walls.push({x: 200, y: 300, w: 60, h: 50}); // Step
        walls.push({x: 450, y: 280, w: 150, h: 70}); // Goal Platform
        tutorialText.push({t:"Use Arrow Keys to Move", x:50, y:200});
        tutorialText.push({t:"SPACE to Jump", x:220, y:250});
    }
    else if (lvl === 1) { // Basics
        player.x = 50; player.y = 300;
        goal = { x: 550, y: 250, w: 30, h: 30 };
        walls.push({x: 0, y: 350, w: 200, h: 50});
        walls.push({x: 230, y: 300, w: 120, h: 20}); 
        walls.push({x: 390, y: 250, w: 120, h: 20});
        walls.push({x: 500, y: 280, w: 100, h: 20});
        hazards.push({x: 280, y: 280, w: 40, h: 20, type:'static'}); // Spike
        tutorialText.push({t:"Red = Danger", x:250, y:150});
    }
    else if (lvl === 2) { // The Pit
        player.x = 30; player.y = 300;
        goal = { x: 550, y: 100, w: 30, h: 30 };
        walls.push({x: 0, y: 350, w: 100, h: 50});
        walls.push({x: 150, y: 300, w: 60, h: 20});
        walls.push({x: 250, y: 250, w: 60, h: 20});
        walls.push({x: 350, y: 200, w: 60, h: 20});
        walls.push({x: 450, y: 150, w: 150, h: 20});
        hazards.push({x: 350, y: 180, w: 20, h: 20, type:'patrol', minX:340, maxX:380, speed:1.5});
    }
    else if (lvl === 3) { // Precarious
        player.x = 30; player.y = 300;
        goal = { x: 550, y: 300, w: 30, h: 30 };
        walls.push({x: 0, y: 350, w: 150, h: 50});
        walls.push({x: 200, y: 350, w: 50, h: 50}); // Small Island
        walls.push({x: 300, y: 350, w: 300, h: 50}); // End Area
        hazards.push({x: 150, y: 380, w: 50, h: 20, type:'static'}); // Lava
        hazards.push({x: 250, y: 380, w: 50, h: 20, type:'static'}); // Lava
        hazards.push({x: 200, y: 200, w: 20, h: 20, type:'patrol', minX:100, maxX:300, speed:3}); // Drone
    }
    else if (lvl === 4) { // Moving Platforms
        player.x = 30; player.y = 250;
        goal = { x: 550, y: 250, w: 30, h: 30 };
        walls.push({x: 0, y: 300, w: 100, h: 20}); // Start
        walls.push({x: 500, y: 300, w: 100, h: 20}); // End
        
        // Moving walls
        walls.push({x: 150, y: 250, w: 80, h: 20, type:'moving', minX:120, maxX:250, speed:2, dx:2});
        walls.push({x: 300, y: 200, w: 80, h: 20, type:'moving', minX:280, maxX:400, speed:-2.5, dx:-2.5});

        hazards.push({x: 0, y: 390, w: 600, h: 10, type:'static'}); // Floor Spike
        tutorialText.push({t:"Ride the platforms!", x:200, y:100});
    }
    else if (lvl === 5) { // The Gauntlet
        player.x = 30; player.y = 350;
        goal = { x: 550, y: 50, w: 30, h: 30 };
        
        walls.push({x: 0, y: 380, w: 100, h: 20}); // Start
        walls.push({x: 150, y: 320, w: 40, h: 20});
        walls.push({x: 250, y: 260, w: 40, h: 20});
        walls.push({x: 350, y: 200, w: 40, h: 20});
        walls.push({x: 450, y: 140, w: 40, h: 20});
        walls.push({x: 520, y: 80, w: 80, h: 20}); // Goal

        hazards.push({x: 200, y: 200, w: 20, h: 20, type:'patrol', minX:180, maxX:500, speed:4});
        hazards.push({x: 400, y: 250, w: 20, h: 20, type:'patrol', minX:100, maxX:450, speed:-3});
    }
    else {
        winGame();
        return;
    }

    hudLevel.innerText = lvl;
}

function startGame() {
    state = 'PLAYING';
    menuScreen.classList.add('hidden');
    deaths = 0;
    level = 0;
    hudDeaths.innerText = 0;
    hudDeaths.style.color = '#fff';
    loadLevel(0);
    loop();
}

function resetGame() {
    victoryScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    state = 'MENU';
}

function winGame() {
    state = 'VICTORY';
    victoryScreen.classList.remove('hidden');
    finalStats.innerText = `Total Attempts: ${deaths}`;
    spawnConfetti();
}

/* --- GAME LOOP --- */
function loop() {
    if (state !== 'PLAYING' && particles.length === 0) return; // Stop loop if menu/vic (save battery)
    
    update();
    draw();
    
    if (state === 'PLAYING' || particles.length > 0) requestAnimationFrame(loop);
}

function update() {
    // Particles always update
    particles.forEach(p => { 
        p.x += p.vx; p.y += p.vy; 
        p.life -= 0.02; 
        p.vy += 0.1; // gravity
    });
    particles = particles.filter(p => p.life > 0);
    if(shakeIntensity > 0) shakeIntensity *= 0.9;

    if (state !== 'PLAYING') return;
    if (isDead) return;

    // --- PLAYER PHYSICS ---
    let moveLeft = keys.ArrowLeft || keys.a;
    let moveRight = keys.ArrowRight || keys.d;
    let jump = keys.ArrowUp || keys.w || keys[' '];

    if (moveLeft) player.vx -= player.speed;
    if (moveRight) player.vx += player.speed;

    player.vx *= (player.grounded ? player.friction : player.airResistance);
    if (player.vx > player.maxSpeed) player.vx = player.maxSpeed;
    if (player.vx < -player.maxSpeed) player.vx = -player.maxSpeed;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;

    player.x += player.vx;
    handleCollisions('x');

    player.vy += player.gravity;
    if (jump && player.grounded) {
        player.vy = player.jumpPower;
        player.grounded = false;
        spawnParticles(player.x + 10, player.y + 20, '#fff', 5);
    }

    player.y += player.vy;
    player.grounded = false; // Assume air until collided
    handleCollisions('y');

    // Screen bounds
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;
    if (player.y > canvas.height + 50) die("Fell into the void");

    // --- OBJECTS ---
    // Moving Walls
    walls.forEach(w => {
        if(w.type === 'moving') {
            w.x += w.dx;
            if(w.x > w.maxX || w.x < w.minX) w.dx *= -1;
        }
    });

    // Hazards
    hazards.forEach(h => {
        if(h.type === 'patrol') {
            h.x += h.speed;
            if(h.x > h.maxX || h.x < h.minX) h.speed *= -1;
        }
        if(checkRectCollide(player, h)) die("Watch out!");
    });

    // Goal
    if(checkRectCollide(player, goal)) {
        spawnParticles(player.x, player.y, '#00ff66', 20);
        level++;
        loadLevel(level);
    }

    // Trail
    if(Math.abs(player.vx) > 1 || Math.abs(player.vy) > 1) {
        player.trail.push({x:player.x, y:player.y, alpha:0.5});
        if(player.trail.length > 5) player.trail.shift();
    }
}

function handleCollisions(axis) {
    for (let w of walls) {
        if (checkRectCollide(player, w)) {
            if (axis === 'x') {
                if (player.vx > 0) player.x = w.x - player.w;
                else if (player.vx < 0) player.x = w.x + w.w;
                player.vx = 0;
            } else {
                if (player.vy > 0) { // Landing
                    player.y = w.y - player.h;
                    player.grounded = true;
                    
                    // Stick to moving platform
                    if(w.type === 'moving') player.x += w.dx;
                    
                    player.vy = 0;
                } else if (player.vy < 0) { // Bonk head
                    player.y = w.y + w.h;
                    player.vy = 0;
                }
            }
        }
    }
}

function checkRectCollide(r1, r2) {
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
}

function die(reason) {
    isDead = true;
    deaths++;
    hudDeaths.innerText = deaths;
    shakeIntensity = 10;
    spawnParticles(player.x + 10, player.y + 10, '#00f3ff', 15);
    showMessage("OOPS!", reason);
    
    setTimeout(() => {
        isDead = false;
        loadLevel(level);
    }, 800);
}

function draw() {
    // BG
    ctx.fillStyle = '#0d0d15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid Effect
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    ctx.save();
    if (shakeIntensity > 0.5) ctx.translate((Math.random()-0.5)*shakeIntensity, (Math.random()-0.5)*shakeIntensity);

    // Walls
    ctx.fillStyle = '#2a2a40';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    walls.forEach(w => {
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 243, 255, 0.2)';
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
        ctx.shadowBlur = 0;
        
        // Platform Detail
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(w.x, w.y, w.w, 5);
        ctx.fillStyle = '#2a2a40';
    });

    // Hazards
    ctx.fillStyle = '#ff3333';
    hazards.forEach(h => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff3333';
        ctx.beginPath();
        ctx.rect(h.x, h.y, h.w, h.h);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Inner Core
        ctx.fillStyle = '#fff';
        ctx.fillRect(h.x + h.w/2 - 4, h.y + h.h/2 - 4, 8, 8);
        ctx.fillStyle = '#ff3333';
    });

    // Goal
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff66';
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
    ctx.shadowBlur = 0;

    // Player Trail
    player.trail.forEach(t => {
        ctx.globalAlpha = t.alpha * 0.3;
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(t.x, t.y, player.w, player.h);
        t.alpha -= 0.1;
    });
    player.trail = player.trail.filter(t => t.alpha > 0);
    ctx.globalAlpha = 1;

    // Player
    if (!isDead) {
        ctx.fillStyle = '#00f3ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f3ff';
        ctx.fillRect(player.x, player.y, player.w, player.h);
        ctx.shadowBlur = 0;
        
        // Face
        ctx.fillStyle = '#000';
        let dir = player.vx >= 0 ? 1 : -1;
        ctx.fillRect(player.x + (dir>0?12:4), player.y + 5, 4, 4); // Eye
    }

    // Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;

    // Tutorial Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px "Press Start 2P"';
    tutorialText.forEach(t => {
        ctx.fillText(t.t, t.x, t.y);
    });

    ctx.restore();
}

/* --- UTILS --- */
function spawnParticles(x, y, color, count) {
    for(let i=0; i<count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function spawnConfetti() {
    for(let i=0; i<100; i++) {
        particles.push({
            x: canvas.width/2, y: canvas.height/2,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            life: 2.0,
            color: `hsl(${Math.random()*360}, 100%, 50%)`,
            size: 6
        });
    }
}

function showMessage(main, sub) {
    msgMain.innerText = main;
    msgSub.innerText = sub;
    msgOverlay.classList.add('show');
    setTimeout(() => msgOverlay.classList.remove('show'), 1500);
}

// Initial Render for menu background
draw();
