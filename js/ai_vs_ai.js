// js/ai_vs_ai.js
// Simulazione IA vs IA (inclusi hooks per reveal, contatori e pulsanti)

// ---------------- CONFIG ----------------
const SIZE = 12;
const SHIPS_CONFIG = [
    {name: "Portaerei", len: 5},
    {name: "Incrociatore", len: 3},
    {name: "Incrociatore", len: 3},
    {name: "Cacciatorpediniere", len: 2},
    {name: "Cacciatorpediniere", len: 2},
    {name: "Sottomarino", len: 1}
];

// ---------------- STATO GLOBALE ----------------
let boardA, boardB, knowA, knowB;
let turn = 'A';
let simTurnCount = 0;
let running = false;
let simTimeout = null;
let stackA = [], stackB = [];
let showShipsA = false, showShipsB = false; // toggles for reveal buttons

// ---------------- LOGGING (solo IA_A / IA_B) ----------------
/**
 * logSim(msg, target, type)
 * target: 'A' | 'B' | 'all'
 * type: 'info' | 'warn'
 */
function logSim(msg, target = 'A', type = 'info') {
    const makeEntry = (cb, extraClass='') => {
        if (!cb) return;
        const d = document.createElement('div');
        d.innerHTML = `&gt; [${new Date().toLocaleTimeString()}] ${msg}`;
        d.className = (type === 'warn') ? 'console-msg-warn' : 'console-msg-info';
        if (extraClass) d.classList.add(extraClass);
        cb.prepend(d);
    };
    if (target === 'A' || target === 'all') {
        makeEntry(document.getElementById('sim-console-A'), 'console-msg-A');
    }
    if (target === 'B' || target === 'all') {
        makeEntry(document.getElementById('sim-console-B'), 'console-msg-B');
    }
}

// ---------------- INIZIALIZZAZIONE e RENDER ----------------
function resetSim() {
    boardA = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    boardB = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    knowA  = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    knowB  = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    simTurnCount = 0;
    turn = 'A';
    running = false;
    stackA = []; stackB = [];
    showShipsA = false; showShipsB = false;
    document.getElementById('sim-status') && (document.getElementById('sim-status').innerText = 'FERMA');
    document.getElementById('sim-turn') && (document.getElementById('sim-turn').innerText = '0');
    clearTimeout(simTimeout);

    placeRandomShips(boardA);
    placeRandomShips(boardB);
    renderSimBoard('boardA', boardA, !showShipsA);
    renderSimBoard('boardB', boardB, !showShipsB);

    // pulisco le console IA
    const aConsoleEl = document.getElementById('sim-console-A');
    if (aConsoleEl) aConsoleEl.innerHTML = '';
    const bConsoleEl = document.getElementById('sim-console-B');
    if (bConsoleEl) bConsoleEl.innerHTML = '';

    // log di avvio/reset su entrambe
    logSim('Simulazione resettata. Navi piazzate.', 'all', 'info');
}

function placeRandomShips(board) {
    SHIPS_CONFIG.forEach(s => {
        let placed = false;
        let attempts = 0;
        while(!placed && attempts < 500) {
            attempts++;
            const r = Math.floor(Math.random() * SIZE);
            const c = Math.floor(Math.random() * SIZE);
            const o = Math.random() > 0.5 ? 'H' : 'V';
            if (canFit(board, r, c, s.len, o)) {
                for (let i = 0; i < s.len; i++) {
                    if (o === 'H') board[r][c + i] = 1;
                    else board[r + i][c] = 1;
                }
                placed = true;
            }
        }
        if (!placed) console.warn('Impossibile piazzare nave:', s);
    });
}

function canFit(board, r, c, len, o) {
    if (o === 'H') {
        if (c + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (board[r][c + i] !== 0) return false;
    } else {
        if (r + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (board[r + i][c] !== 0) return false;
    }
    return true;
}

function renderSimBoard(id, board, hideShips) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const v = board[r][c];
            if (v === 1 && !hideShips) cell.classList.add('ship');
            if (v === 2) cell.classList.add('miss');
            if (v === 3) cell.classList.add('hit');
            container.appendChild(cell);
        }
    }
}

// ---------------- STRATEGIE DI TIRO ----------------
function getRandomShotFromKnowledge(knowledge) {
    let r, c;
    do {
        r = Math.floor(Math.random() * SIZE);
        c = Math.floor(Math.random() * SIZE);
    } while (knowledge[r][c] >= 2);
    return {r, c};
}

function getMediumShotFromKnowledge(knowledge, targetStack) {
    while (targetStack.length > 0) {
        const s = targetStack.pop();
        if (s && s.r >= 0 && s.r < SIZE && s.c >= 0 && s.c < SIZE && knowledge[s.r][s.c] < 2) return s;
    }
    return getRandomShotFromKnowledge(knowledge);
}

function generateProbabilityMapFromKnowledge(knowledge) {
    let pMap = Array.from({length: SIZE}, () => Array(SIZE).fill(0));
    SHIPS_CONFIG.forEach(s => {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (canFitForProb(knowledge, r, c, s.len, 'H')) for (let i = 0; i < s.len; i++) pMap[r][c + i]++;
                if (canFitForProb(knowledge, r, c, s.len, 'V')) for (let i = 0; i < s.len; i++) pMap[r + i][c]++;
            }
        }
    });
    return pMap;
}

function canFitForProb(knowledge, r, c, len, o) {
    if (o === 'H') {
        if (c + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (knowledge[r][c + i] >= 2) return false;
    } else {
        if (r + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (knowledge[r + i][c] >= 2) return false;
    }
    return true;
}

function getHardShotFromKnowledge(knowledge) {
    const pMap = generateProbabilityMapFromKnowledge(knowledge);
    let max = -1, best = {r: 0, c: 0};
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (knowledge[r][c] < 2 && pMap[r][c] > max) {
                max = pMap[r][c];
                best = {r, c};
            }
        }
    }
    return best;
}

// ---------------- APPLY SHOT ----------------
function applyShot(shooter, targetBoard, shooterKnowledge, targetStack) {
    const logic = (shooter === 'A') ? document.getElementById('iaA-select').value : document.getElementById('iaB-select').value;

    let shot;
    if (logic === 'hard') shot = getHardShotFromKnowledge(shooterKnowledge);
    else if (logic === 'medium') shot = getMediumShotFromKnowledge(shooterKnowledge, targetStack);
    else shot = getRandomShotFromKnowledge(shooterKnowledge);

    let rr = shot.r, cc = shot.c;

    if (shooterKnowledge[rr][cc] >= 2) {
        const fallback = getRandomShotFromKnowledge(shooterKnowledge);
        rr = fallback.r; cc = fallback.c;
    }

    if (targetBoard[rr][cc] === 1) {
        targetBoard[rr][cc] = 3;
        shooterKnowledge[rr][cc] = 3;
        // push adjacency for hunt logic
        targetStack.push({r: rr - 1, c: cc}, {r: rr + 1, c: cc}, {r: rr, c: cc - 1}, {r: rr, c: cc + 1});
        // log only to IA consoles (also send to opponent to keep both informed)
        logSim(`${shooter} COLPITO a [${rr},${cc}]`, shooter, 'warn');
        logSim(`${shooter} COLPITO a [${rr},${cc}]`, (shooter === 'A') ? 'B' : 'A', 'warn');
        return true;
    } else {
        if (targetBoard[rr][cc] === 0) targetBoard[rr][cc] = 2;
        shooterKnowledge[rr][cc] = 2;
        logSim(`${shooter} ACQUA a [${rr},${cc}]`, shooter, 'info');
        logSim(`${shooter} ACQUA a [${rr},${cc}]`, (shooter === 'A') ? 'B' : 'A', 'info');
        return false;
    }
}

function checkWinBoard(board) { return !board.flat().includes(1); }

// ---------------- CICLO SIMULAZIONE ----------------
function runSimulationStep() {
    if (!running) return;
    const currentShooter = turn;
    simTurnCount++;
    document.getElementById('sim-turn') && (document.getElementById('sim-turn').innerText = simTurnCount);
    let hit = false;

    if (currentShooter === 'A') {
        hit = applyShot('A', boardB, knowA, stackA);
        renderSimBoard('boardB', boardB, !showShipsB);
        renderSimBoard('boardA', boardA, !showShipsA);
        updateCounts();
        if (checkWinBoard(boardB)) {
            logSim('IA A VINCE LA SIMULAZIONE!', 'all', 'warn');
            stopSimulation();
            return;
        }
        if (!hit) turn = 'B';
    } else {
        hit = applyShot('B', boardA, knowB, stackB);
        renderSimBoard('boardA', boardA, !showShipsA);
        renderSimBoard('boardB', boardB, !showShipsB);
        updateCounts();
        if (checkWinBoard(boardA)) {
            logSim('IA B VINCE LA SIMULAZIONE!', 'all', 'warn');
            stopSimulation();
            return;
        }
        if (!hit) turn = 'A';
    }

    simTimeout = setTimeout(runSimulationStep, hit ? 250 : 450);
}

// ---------------- CONTROLLI start/stop/reset ----------------
function startSimulation() {
    if (running) return;
    running = true;
    document.getElementById('sim-status') && (document.getElementById('sim-status').innerText = 'IN ESECUZIONE');
    logSim('Simulazione avviata.', 'all', 'info');
    runSimulationStep();
}

function stopSimulation() {
    running = false;
    clearTimeout(simTimeout);
    document.getElementById('sim-status') && (document.getElementById('sim-status').innerText = 'FERMA');
    logSim('Simulazione fermata.', 'all', 'info');
}

// ---------------- HOOK UI: pulsanti + reveal + contatori ----------------
function hookAiUi() {
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const revealAbtn = document.getElementById('revealA');
    const revealBbtn = document.getElementById('revealB');

    if (startBtn) startBtn.addEventListener('click', startSimulation);
    if (pauseBtn) pauseBtn.addEventListener('click', () => { running ? stopSimulation() : startSimulation(); });
    if (resetBtn) resetBtn.addEventListener('click', () => { stopSimulation(); resetSim(); });

    if (revealAbtn) revealAbtn.addEventListener('click', () => {
        showShipsA = !showShipsA;
        renderSimBoard('boardA', boardA, !showShipsA);
        logSim(`MOSTRA NAVI A: ${showShipsA ? 'ON' : 'OFF'}`, 'A', 'info');
    });

    if (revealBbtn) revealBbtn.addEventListener('click', () => {
        showShipsB = !showShipsB;
        renderSimBoard('boardB', boardB, !showShipsB);
        logSim(`MOSTRA NAVI B: ${showShipsB ? 'ON' : 'OFF'}`, 'B', 'info');
    });

    // periodic update contatori navi (mostra solo celle con valore 1 = nave non colpita)
    setInterval(updateCounts, 400);
}

function updateCounts() {
    const ca = boardA ? boardA.flat().filter(x => x === 1).length : '—';
    const cb = boardB ? boardB.flat().filter(x => x === 1).length : '—';
    const elA = document.getElementById('countA');
    const elB = document.getElementById('countB');
    if (elA) elA.innerText = ca;
    if (elB) elB.innerText = cb;
}

// ---------------- DOM ready ----------------
document.addEventListener('DOMContentLoaded', () => {
    hookAiUi();
    resetSim();
});