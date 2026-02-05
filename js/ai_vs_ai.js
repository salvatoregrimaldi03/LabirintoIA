// js/ai_vs_ai.js
// Simulazione Battleship IA vs IA — versione completa con TIMELINE LOG

// ---------------- CONFIG ----------------
const SIZE = 12;
const SHIPS_CONFIG = [
    { name: "Portaerei", len: 5 },
    { name: "Incrociatore", len: 3 },
    { name: "Incrociatore", len: 3 },
    { name: "Cacciatorpediniere", len: 2 },
    { name: "Cacciatorpediniere", len: 2 },
    { name: "Sottomarino", len: 1 }
];

// ---------------- STATO GLOBALE ----------------
let boardA = null;
let boardB = null;
let knowA = null;
let knowB = null;

let turn = 'A';
let simTurnCount = 0;
let running = false;
let simTimeout = null;

let stackA = [];
let stackB = [];

let showShipsA = false;
let showShipsB = false;

// LOG BATTAGLIA (Timeline per il grafico)
// Struttura:Array<{ turn: number, shooter: 'A'|'B', isHit: boolean }>
let battleLog = [];

// Statistiche totali
let matchStats = {
    A: { hits: 0, misses: 0, algo: '' },
    B: { hits: 0, misses: 0, algo: '' }
};

// ---------------- UTIL / DOM SAFE GET ----------------
function $(id) {
    return document.getElementById(id);
}

// ---------------- LOGGING ----------------
function logSim(msg, target = 'A', type = 'info') {
    const write = (el, color) => {
        if (!el) return;
        const d = document.createElement('div');
        const time = new Date().toLocaleTimeString();
        d.innerHTML = `&gt; [${time}] ${msg}`;
        d.className = (type === 'warn') ? 'console-msg-warn' : 'console-msg-info';
        if (color) d.style.color = color;
        el.prepend(d);
    };

    if (target === 'A' || target === 'all') write($('sim-console-A'), '#6ef0ff');
    if (target === 'B' || target === 'all') write($('sim-console-B'), '#ffb0d1');
}

// ---------------- BLOCCO UI ----------------
function lockAiSelectors(lock) {
    const a = $('iaA-select');
    const b = $('iaB-select');
    if (a) a.disabled = !!lock;
    if (b) b.disabled = !!lock;
}

// ---------------- INIZIALIZZAZIONE SIM ----------------
function resetSim() {
    boardA = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    boardB = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    knowA  = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    knowB  = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

    simTurnCount = 0;
    turn = 'A';
    running = false;
    stackA = [];
    stackB = [];
    showShipsA = false;
    showShipsB = false;

    // Reset LOG e Stats
    battleLog = [];
    matchStats = {
        A: { hits: 0, misses: 0, algo: '' },
        B: { hits: 0, misses: 0, algo: '' }
    };

    lockAiSelectors(false);

    if (simTimeout) {
        clearTimeout(simTimeout);
        simTimeout = null;
    }

    if ($('sim-status')) $('sim-status').innerText = 'FERMA';
    if ($('sim-turn')) $('sim-turn').innerText = '0';

    const btnNewReport = $('btn-new-report');
    if (btnNewReport) btnNewReport.style.display = 'none';

    placeRandomShips(boardA);
    placeRandomShips(boardB);

    renderSimBoard('boardA', boardA, true);
    renderSimBoard('boardB', boardB, true);

    if ($('sim-console-A')) $('sim-console-A').innerHTML = '';
    if ($('sim-console-B')) $('sim-console-B').innerHTML = '';

    logSim('Simulazione resettata. Navi piazzate.', 'all', 'info');
}

// ---------------- PIAZZAMENTO NAVI ----------------
function placeRandomShips(board) {
    SHIPS_CONFIG.forEach(s => {
        let placed = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 500;
        while (!placed && attempts < MAX_ATTEMPTS) {
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
        if (!placed) {
            outer: for (let rr = 0; rr < SIZE && !placed; rr++) {
                for (let cc = 0; cc < SIZE && !placed; cc++) {
                    if (canFit(board, rr, cc, s.len, 'H')) {
                        for (let i = 0; i < s.len; i++) board[rr][cc + i] = 1;
                        placed = true;
                        break outer;
                    }
                    if (canFit(board, rr, cc, s.len, 'V')) {
                        for (let i = 0; i < s.len; i++) board[rr + i][cc] = 1;
                        placed = true;
                        break outer;
                    }
                }
            }
        }
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

// ---------------- RENDER BOARD ----------------
function renderSimBoard(id, board, hideShips) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const val = board[r][c];
            if (val === 1 && !hideShips) cell.classList.add('ship');
            if (val === 2) cell.classList.add('miss');
            if (val === 3) cell.classList.add('hit');
            el.appendChild(cell);
        }
    }
}

// ---------------- STRATEGIE IA ----------------
function getRandomShot(knowledge) {
    let r, c;
    do {
        r = Math.floor(Math.random() * SIZE);
        c = Math.floor(Math.random() * SIZE);
    } while (knowledge[r][c] >= 2);
    return { r, c };
}

function getMediumShot(knowledge, stack) {
    while (stack.length > 0) {
        const s = stack.pop();
        if (s && s.r >= 0 && s.r < SIZE && s.c >= 0 && s.c < SIZE && knowledge[s.r][s.c] < 2) {
            return s;
        }
    }
    return getRandomShot(knowledge);
}

function getHardShot(knowledge) {
    const pMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    SHIPS_CONFIG.forEach(s => {
        const len = s.len;
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (canFitProb(knowledge, r, c, len, 'H')) {
                    for (let i = 0; i < len; i++) pMap[r][c + i]++;
                }
                if (canFitProb(knowledge, r, c, len, 'V')) {
                    for (let i = 0; i < len; i++) pMap[r + i][c]++;
                }
            }
        }
    });

    let max = -1;
    let best = { r: 0, c: 0 };
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (knowledge[r][c] < 2 && pMap[r][c] > max) {
                max = pMap[r][c];
                best = { r, c };
            }
        }
    }
    return best;
}

function canFitProb(knowledge, r, c, len, o) {
    if (o === 'H') {
        if (c + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (knowledge[r][c + i] >= 2) return false;
    } else {
        if (r + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (knowledge[r + i][c] >= 2) return false;
    }
    return true;
}

// ---------------- APPLICA COLPO ----------------
function applyShot(shooter, targetBoard, knowledge, stack) {
    const sel = (shooter === 'A') ? $('iaA-select') : $('iaB-select');
    let logic = 'easy';
    let algoText = '';

    if (sel) {
        logic = sel.value;
        algoText = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : sel.value;
    }

    if (matchStats[shooter]) matchStats[shooter].algo = algoText || logic;

    let shot;
    if (logic === 'hard') shot = getHardShot(knowledge);
    else if (logic === 'medium') shot = getMediumShot(knowledge, stack);
    else shot = getRandomShot(knowledge);

    const { r, c } = shot;

    if (knowledge[r][c] >= 2) {
        outerFallback: for (let rr = 0; rr < SIZE; rr++) {
            for (let cc = 0; cc < SIZE; cc++) {
                if (knowledge[rr][cc] < 2) {
                    shot.r = rr; shot.c = cc;
                    break outerFallback;
                }
            }
        }
    }

    let isHit = false;

    if (targetBoard[shot.r][shot.c] === 1) {
        targetBoard[shot.r][shot.c] = 3; 
        knowledge[shot.r][shot.c] = 3;
        stack.push(
            { r: shot.r - 1, c: shot.c },
            { r: shot.r + 1, c: shot.c },
            { r: shot.r, c: shot.c - 1 },
            { r: shot.r, c: shot.c + 1 }
        );
        logSim(`COLPITO a [${shot.r},${shot.c}]`, shooter, 'warn');
        if (matchStats[shooter]) matchStats[shooter].hits++;
        isHit = true;
    } else {
        if (targetBoard[shot.r][shot.c] === 0) targetBoard[shot.r][shot.c] = 2;
        knowledge[shot.r][shot.c] = 2;
        logSim(`ACQUA a [${shot.r},${shot.c}]`, shooter, 'info');
        if (matchStats[shooter]) matchStats[shooter].misses++;
        isHit = false;
    }

    // --- REGISTRAZIONE NELLA TIMELINE ---
    battleLog.push({
        turn: simTurnCount,
        shooter: shooter,
        isHit: isHit
    });

    return isHit;
}

function checkWin(board) {
    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (board[r][c] === 1) return false;
        }
    }
    return true;
}

// ---------------- LOOP DI SIMULAZIONE ----------------
function runSimulationStep() {
    if (!running) return;

    simTurnCount++;
    if ($('sim-turn')) $('sim-turn').innerText = simTurnCount;

    let hit;
    if (turn === 'A') {
        hit = applyShot('A', boardB, knowA, stackA);
        renderSimBoard('boardB', boardB, !showShipsB);
        if (checkWin(boardB)) {
            finishGame('A');
            return;
        }
        if (!hit) turn = 'B';
    } else {
        hit = applyShot('B', boardA, knowB, stackB);
        renderSimBoard('boardA', boardA, !showShipsA);
        if (checkWin(boardA)) {
            finishGame('B');
            return;
        }
        if (!hit) turn = 'A';
    }

    updateCounts();
    const delay = hit ? 150 : 300;
    simTimeout = setTimeout(runSimulationStep, delay);
}

function finishGame(winner) {
    logSim(`IA ${winner} VINCE LA SIMULAZIONE!`, 'all', 'warn');
    stopSimulation();

    // SALVA REPORT CON HISTORY
    const reportData = {
        winner,
        turns: simTurnCount,
        timestamp: new Date().toLocaleString(),
        stats: matchStats,
        history: battleLog, // <-- ECCO IL NUOVO DATO
        params: {
            size: SIZE,
            ships: SHIPS_CONFIG.map(s => ({ name: s.name, len: s.len })),
            iaA: $('iaA-select') ? $('iaA-select').value : null,
            iaB: $('iaB-select') ? $('iaB-select').value : null
        }
    };

    try {
        localStorage.setItem('battleshipReport', JSON.stringify(reportData));
    } catch (e) {
        console.warn('Impossibile salvare report in localStorage:', e);
    }

    const btn = $('btn-new-report');
    if (btn) btn.style.display = 'inline-block';
}

// ---------------- CONTROLLI ----------------
function startSimulation() {
    if (running) return;
    running = true;
    lockAiSelectors(true);
    if ($('sim-status')) $('sim-status').innerText = 'IN ESECUZIONE';
    const btnNew = $('btn-new-report');
    if (btnNew) btnNew.style.display = 'none';
    logSim('Simulazione avviata.', 'all', 'info');
    runSimulationStep();
}

function stopSimulation() {
    running = false;
    if (simTimeout) {
        clearTimeout(simTimeout);
        simTimeout = null;
    }
    lockAiSelectors(false);
    if ($('sim-status')) $('sim-status').innerText = 'FERMA';
    logSim('Simulazione fermata.', 'all', 'info');
}

function toggleSimulation() {
    if (running) stopSimulation();
    else startSimulation();
}

function hookAiUi() {
    const startBtn = $('start-btn');
    const pauseBtn = $('pause-btn');
    const resetBtn = $('reset-btn');
    const revealA = $('revealA');
    const revealB = $('revealB');
    const lastReportBtn = $('last-report-btn');

    if (startBtn) startBtn.onclick = startSimulation;
    if (pauseBtn) pauseBtn.onclick = toggleSimulation;
    if (resetBtn) resetBtn.onclick = () => { stopSimulation(); resetSim(); };

    if (revealA) revealA.onclick = () => {
        showShipsA = !showShipsA;
        renderSimBoard('boardA', boardA, !showShipsA);
        logSim(`MOSTRA NAVI A: ${showShipsA ? 'ON' : 'OFF'}`, 'A', 'info');
    };

    if (revealB) revealB.onclick = () => {
        showShipsB = !showShipsB;
        renderSimBoard('boardB', boardB, !showShipsB);
        logSim(`MOSTRA NAVI B: ${showShipsB ? 'ON' : 'OFF'}`, 'B', 'info');
    };

    try {
        const saved = localStorage.getItem('battleshipReport');
        if (saved && lastReportBtn) lastReportBtn.style.display = 'inline-block';
    } catch (e) {}

    setInterval(updateCounts, 400);
}

function updateCounts() {
    if (boardA && $('countA')) {
        $('countA').innerText = boardA.flat().filter(x => x === 1).length;
    }
    if (boardB && $('countB')) {
        $('countB').innerText = boardB.flat().filter(x => x === 1).length;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    hookAiUi();
    resetSim();
});
