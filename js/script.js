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

function logToConsole(msg, type = 'info') {
    const consoleBody = document.getElementById('ai-console');
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
    
    document.getElementById('turn-display').innerText = "0";
    document.getElementById('difficulty-select').disabled = false;
    document.getElementById('setup-controls').style.display = 'block';
    document.getElementById('game-controls').style.display = 'none';
    
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
                // FINE FASE SETUP
                isPlacementPhase = false;
                document.getElementById('setup-controls').style.display = 'none';
                document.getElementById('game-controls').style.display = 'block';
                
                // BLOCCA LA SCELTA QUI
                document.getElementById('difficulty-select').disabled = true;
                
                logToConsole("FLOTTA PRONTA. MODALITÀ IA CONFERMATA E BLOCCATA.", "warn");
            }
            updateSetupUI();
            renderBoard('player-board', playerBoard, false);
        }
    } else if (!isPlacementPhase && id === 'ai-board') {
        if(aiBoard[r][c] >= 2) return;
        turnCount++;
        document.getElementById('turn-display').innerText = turnCount;
        aiBoard[r][c] = aiBoard[r][c] === 1 ? 3 : 2;
        renderBoard('ai-board', aiBoard, true);
        if(!checkWin(aiBoard)) setTimeout(aiTurn, 400);
        else logToConsole("VITTORIA UTENTE!", "warn");
    }
}

function aiTurn() {
    const diff = document.getElementById('difficulty-select').value;
    let shot;
    
    // Messaggi specifici richiesti
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
    if (playerBoard[r][c] === 1) {
        playerBoard[r][c] = 3;
        logToConsole(`AI: COLPITO a [${r},${c}]!`, "warn");
        aiTargetStack.push({r:r-1, c}, {r:r+1, c}, {r, c:c-1}, {r, c:c+1});
        if(checkWin(playerBoard)) logToConsole("AI VITTORIA: Flotta nemica distrutta.");
        else setTimeout(aiTurn, 600);
    } else {
        playerBoard[r][c] = 2;
        logToConsole(`AI: ACQUA a [${r},${c}]`, "info");
    }
    renderBoard('player-board', playerBoard, false);
}

// ... (tutte le altre funzioni di supporto rimangono uguali a prima)
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
        while(!placed) {
            let r = Math.floor(Math.random()*SIZE), c = Math.floor(Math.random()*SIZE), o = Math.random()>0.5?'H':'V';
            if(canFit(aiBoard, r, c, s.len, o)) {
                for(let i=0; i<s.len; i++) { if(o==='H') aiBoard[r][c+i] = 1; else aiBoard[r+i][c] = 1; }
                placed = true;
            }
        }
    });
}

function checkWin(board) { return !board.flat().includes(1); }
function toggleOrientation() { orientation = orientation === 'H' ? 'V' : 'H'; }
function updateSetupUI() {
    const ship = SHIPS_CONFIG[currentShipIdx];
    if(ship) {
        document.getElementById('current-ship-name').innerText = ship.name;
        document.getElementById('current-ship-len').innerText = ship.len;
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
