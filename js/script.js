// js/script.js
// Modalità Umano vs IA — con salvataggio Timeline per report grafico

const SIZE = 12;
const SHIPS_CONFIG = [
    {name: "Portaerei", len: 5},
    {name: "Incrociatore", len: 3},
    {name: "Incrociatore", len: 3},
    {name: "Cacciatorpediniere", len: 2},
    {name: "Cacciatorpediniere", len: 2},
    {name: "Sottomarino", len: 1}
];

let playerBoard, aiBoard, isPlacementPhase, currentShipIdx, orientation, aiTargetStack;
let turnCount = 0;
let showHeatmap = false;

// Stats Totali
let statsHumanHits = 0;
let statsHumanMisses = 0;
let statsAIHits = 0;
let statsAIMisses = 0;

// LOG BATTAGLIA (Timeline)
let battleLog = [];

function logToConsole(msg, type = 'info') {
    const consoleBody = document.getElementById('ai-console');
    if (!consoleBody) return;
    const div = document.createElement('div');
    div.innerHTML = `> [${new Date().toLocaleTimeString()}] ${msg}`;
    if(type === 'warn') div.classList.add('console-msg-warn');
    else div.classList.add('console-msg-info');
    consoleBody.prepend(div);
}

function resetGame() {
    playerBoard = Array(SIZE).fill().map(() => Array(SIZE).fill(0));
    aiBoard = Array(SIZE).fill().map(() => Array(SIZE).fill(0));
    isPlacementPhase = true;
    currentShipIdx = 0;
    orientation = 'H';
    aiTargetStack = [];
    turnCount = 0;

    statsHumanHits = 0;
    statsHumanMisses = 0;
    statsAIHits = 0;
    statsAIMisses = 0;
    
    // Reset Log
    battleLog = [];
    
    document.getElementById('turn-display').innerText = "0";
    const diffSel = document.getElementById('difficulty-select');
    if (diffSel) diffSel.disabled = false;
    const setupControls = document.getElementById('setup-controls');
    const gameControls = document.getElementById('game-controls');
    if (setupControls) setupControls.style.display = 'block';
    if (gameControls) gameControls.style.display = 'none';
    
    updateSetupUI();
    renderBoard('player-board', playerBoard, false);
    renderBoard('ai-board', aiBoard, true);
    placeAiShips();
    logToConsole("SISTEMA RESETTATO. Scegli la logica IA e piazza le navi.");
}

function handleCellClick(id, r, c) {
    if (isPlacementPhase && id === 'player-board') {
        let ship = SHIPS_CONFIG[currentShipIdx];
        if (canFit(playerBoard, r, c, ship.len, orientation)) {
            for (let i = 0; i < ship.len; i++) {
                if (orientation === 'H') playerBoard[r][c+i] = 1;
                else playerBoard[r+i][c] = 1;
            }
            currentShipIdx++;
            if (currentShipIdx >= SHIPS_CONFIG.length) {
                isPlacementPhase = false;
                const setup = document.getElementById('setup-controls');
                const game = document.getElementById('game-controls');
                if (setup) setup.style.display = 'none';
                if (game) game.style.display = 'block';
                const diffSel = document.getElementById('difficulty-select');
                if (diffSel) diffSel.disabled = true;
                logToConsole("FLOTTA PRONTA. MODALITÀ IA CONFERMATA E BLOCCATA.", "warn");
            }
            updateSetupUI();
            renderBoard('player-board', playerBoard, false);
        }
    } else if (!isPlacementPhase && id === 'ai-board') {
        if(aiBoard[r][c] >= 2) return;
        turnCount++;
        document.getElementById('turn-display').innerText = turnCount;

        let isHit = false;
        if (aiBoard[r][c] === 1) {
            statsHumanHits++;
            aiBoard[r][c] = 3;
            isHit = true;
        } else {
            statsHumanMisses++;
            aiBoard[r][c] = 2;
            isHit = false;
        }

        // REGISTRAZIONE UTENTE (A)
        battleLog.push({
            turn: turnCount,
            shooter: 'A', // Human is A
            isHit: isHit
        });

        renderBoard('ai-board', aiBoard, true);

        if(!checkWin(aiBoard)) {
            setTimeout(aiTurn, 400);
        } else {
            logToConsole("VITTORIA UTENTE!", "warn");
            saveHvAReport('A');
        }
    }
}

function aiTurn() {
    const diff = document.getElementById('difficulty-select') ? document.getElementById('difficulty-select').value : 'easy';
    let shot;
    
    if (diff === 'hard') {
        logToConsole("Attacco probabilistico in corso...");
        shot = getHardShot();
    } else if (diff === 'medium') {
        logToConsole("Ricerca locale in corso...");
        shot = getMediumShot();
    } else {
        logToConsole("Scelta mossa casuale...");
        shot = getRandomShot();
    }

    const { r, c } = shot;
    let isHit = false;

    if (playerBoard[r][c] === 1) {
        playerBoard[r][c] = 3;
        statsAIHits++;
        isHit = true;
        logToConsole(`AI: COLPITO a [${r},${c}]!`, "warn");
        aiTargetStack.push({r:r-1, c}, {r:r+1, c}, {r, c:c-1}, {r, c:c+1});
    } else {
        playerBoard[r][c] = 2;
        statsAIMisses++;
        isHit = false;
        logToConsole(`AI: ACQUA a [${r},${c}]`, "info");
    }

    // REGISTRAZIONE AI (B)
    battleLog.push({
        turn: turnCount,
        shooter: 'B', // AI is B
        isHit: isHit
    });

    renderBoard('player-board', playerBoard, false);

    if(checkWin(playerBoard)) {
        logToConsole("AI VITTORIA: Flotta nemica distrutta.");
        saveHvAReport('B');
    } else if (isHit) {
        // Se l'IA colpisce, rigioca subito dopo breve delay? 
        // Nel codice precedente l'IA rigiocava. Qui manteniamo lo standard.
        // Attenzione: se rigioca, è tecnicamente lo stesso turno o no?
        // Per semplicità nel grafico teniamo lo stesso "turnCount" o incrementiamo?
        // In Battleship di solito si rigioca. 
        setTimeout(aiTurn, 600);
    }
}

function generateProbabilityMap() {
    let pMap = Array(SIZE).fill().map(() => Array(SIZE).fill(0));
    SHIPS_CONFIG.forEach(s => {
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (canFitForProb(r, c, s.len, 'H')) for(let i=0; i<s.len; i++) pMap[r][c+i]++;
                if (canFitForProb(r, c, s.len, 'V')) for(let i=0; i<s.len; i++) pMap[r+i][c]++;
            }
        }
    });
    return pMap;
}

function renderBoard(id, board, isHidden) {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = '';
    let pMap = (id === 'player-board' && showHeatmap) ? generateProbabilityMap() : null;

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (pMap && playerBoard[r][c] < 2) {
                const intensity = Math.min(255, (pMap[r][c] * 12)); 
                cell.style.backgroundColor = `rgb(${intensity}, ${intensity/4}, ${150 - intensity/2})`;
                cell.classList.add('heatmap-active');
            }
            if (board[r][c] === 1 && !isHidden) cell.classList.add('ship');
            if (board[r][c] === 2) cell.classList.add('miss');
            if (board[r][c] === 3) cell.classList.add('hit');
            cell.onclick = () => handleCellClick(id, r, c);
            container.appendChild(cell);
        }
    }
}

function getHardShot() {
    let pMap = generateProbabilityMap();
    let max = -1, best = {r:0, c:0};
    pMap.forEach((row, r) => row.forEach((val, c) => {
        if (playerBoard[r][c] < 2 && val > max) { max = val; best = {r, c}; }
    }));
    return best;
}

function canFit(board, r, c, len, o) {
    if (o === 'H') {
        if (c + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (board[r][c+i] !== 0) return false;
    } else {
        if (r + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (board[r+i][c] !== 0) return false;
    }
    return true;
}

function canFitForProb(r, c, len, o) {
    if (o === 'H') {
        if (c + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (playerBoard[r][c+i] >= 2) return false;
    } else {
        if (r + len > SIZE) return false;
        for (let i = 0; i < len; i++) if (playerBoard[r+i][c] >= 2) return false;
    }
    return true;
}

function getRandomShot() {
    let r, c;
    do { r = Math.floor(Math.random()*SIZE); c = Math.floor(Math.random()*SIZE); } while(playerBoard[r][c]>=2);
    return {r,c};
}

function getMediumShot() {
    while(aiTargetStack.length > 0) {
        let s = aiTargetStack.pop();
        if(s.r>=0 && s.r<SIZE && s.c>=0 && s.c<SIZE && playerBoard[s.r][s.c]<2) return s;
    }
    return getRandomShot();
}

function placeAiShips() {
    SHIPS_CONFIG.forEach(s => {
        let placed = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 500;
        while(!placed && attempts < MAX_ATTEMPTS) {
            attempts++;
            let r = Math.floor(Math.random()*SIZE), c = Math.floor(Math.random()*SIZE), o = Math.random()>0.5?'H':'V';
            if(canFit(aiBoard, r, c, s.len, o)) {
                for(let i=0; i<s.len; i++) { if(o==='H') aiBoard[r][c+i] = 1; else aiBoard[r+i][c] = 1; }
                placed = true;
            }
        }
        if(!placed) {
            outer: for (let rr = 0; rr < SIZE && !placed; rr++) {
                for (let cc = 0; cc < SIZE && !placed; cc++) {
                    if (canFit(aiBoard, rr, cc, s.len, 'H')) {
                        for (let i = 0; i < s.len; i++) aiBoard[rr][cc+i] = 1;
                        placed = true; break outer;
                    }
                    if (canFit(aiBoard, rr, cc, s.len, 'V')) {
                        for (let i = 0; i < s.len; i++) aiBoard[rr+i][cc] = 1;
                        placed = true; break outer;
                    }
                }
            }
        }
    });
}

function checkWin(board) { return !board.flat().includes(1); }
function toggleOrientation() { orientation = orientation === 'H' ? 'V' : 'H'; }
function updateSetupUI() {
    const ship = SHIPS_CONFIG[currentShipIdx];
    if(ship) {
        const elName = document.getElementById('current-ship-name');
        const elLen = document.getElementById('current-ship-len');
        if (elName) elName.innerText = ship.name;
        if (elLen) elLen.innerText = ship.len;
    }
}

function saveHvAReport(winner) {
    const diffSel = document.getElementById('difficulty-select');
    const difficultyValue = diffSel ? diffSel.value : 'easy';
    const difficultyLabel = diffSel ? (diffSel.options[diffSel.selectedIndex] ? diffSel.options[diffSel.selectedIndex].text : difficultyValue) : difficultyValue;

    const reportData = {
        winner: winner,
        turns: turnCount,
        timestamp: new Date().toLocaleString(),
        stats: {
            A: { hits: statsHumanHits, misses: statsHumanMisses, algo: 'UTENTE' },
            B: { hits: statsAIHits, misses: statsAIMisses, algo: difficultyLabel }
        },
        history: battleLog, // Salva la timeline
        params: {
            mode: 'HVA',
            iaDifficulty: difficultyValue,
            iaDifficultyLabel: difficultyLabel,
            size: SIZE,
            ships: SHIPS_CONFIG.map(s => ({ name: s.name, len: s.len }))
        }
    };

    try {
        localStorage.setItem('battleshipReport', JSON.stringify(reportData));
        logToConsole("Report salvato localmente (puoi visualizzarlo con ULTIMO REPORT PDF).", "info");
    } catch (e) {
        console.warn('Errore salvataggio report:', e);
    }
}

window.onload = resetGame;
window.addEventListener('keydown', (e) => { 
    if(e.key.toLowerCase()==='r') toggleOrientation();
    if(e.key.toLowerCase()==='h') {
        showHeatmap = !showHeatmap;
        renderBoard('player-board', playerBoard, false);
    }
});
