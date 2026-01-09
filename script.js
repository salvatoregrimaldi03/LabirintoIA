// Labirinto 10x15
const mazeData = [
[0,0,1,0,0,0,1,0,0,0,0,1,0,0,0],
[0,1,1,1,1,0,1,0,1,1,0,1,0,1,0],
[0,0,0,0,1,0,0,0,1,0,0,0,0,1,0],
[1,1,1,0,1,1,1,0,1,0,1,1,0,1,0],
[0,0,0,0,0,0,1,0,0,0,1,0,0,0,0],
[0,1,1,1,1,0,1,1,1,0,1,1,1,1,0],
[0,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
[0,1,1,0,1,1,1,1,1,1,1,1,1,1,0],
[0,0,0,0,0,0,0,0,1,0,0,0,0,1,0],
[0,1,1,1,1,1,1,0,0,0,1,1,0,0,0]
];

const start=[0,0], goal=[9,14];
const mazeDiv=document.getElementById("maze");

// Disegna griglia
function drawMaze(){
    mazeDiv.innerHTML="";
    mazeData.forEach((row,i)=>{
        row.forEach((cell,j)=>{
            const div=document.createElement("div");
            div.classList.add("cell");
            if(cell===1) div.classList.add("wall");
            if(i===start[0] && j===start[1]) div.classList.add("start");
            if(i===goal[0] && j===goal[1]) div.classList.add("goal");
            div.id=`c-${i}-${j}`;
            mazeDiv.appendChild(div);
        });
    });
}

// Trova vicini validi
function neighbors([x,y]){
    return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]
        .filter(n=>n[0]>=0 && n[1]>=0 && n[0]<10 && n[1]<15 && mazeData[n[0]][n[1]]===0);
}

// Euristica Manhattan
function heuristic(a,b){
    return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]);
}

// Animazione percorso e nodi visitati
async function animate(path, visited){
    for(let v of visited){
        document.getElementById(`c-${v[0]}-${v[1]}`).classList.add("visited");
        await new Promise(r=>setTimeout(r,20));
    }
    for(let p of path){
        document.getElementById(`c-${p[0]}-${p[1]}`).classList.add("path");
        await new Promise(r=>setTimeout(r,50));
    }
    document.getElementById("stats").innerText = `Nodi esplorati: ${visited.length} | Lunghezza percorso: ${path.length}`;
}

// BFS
function runBFS(){
    drawMaze();
    let q=[[start,[start]]], visited=new Set(), vis=[];
    visited.add(start+"");
    while(q.length){
        let [n,path]=q.shift();
        vis.push(n);
        if(n+""===goal+"") return animate(path,vis);
        neighbors(n).forEach(nb=>{
            if(!visited.has(nb+"")){
                visited.add(nb+"");
                q.push([nb,[...path,nb]]);
            }
        });
    }
}

// DFS
function runDFS(){
    drawMaze();
    let stack=[[start,[start]]], visited=new Set(), vis=[];
    visited.add(start+"");
    while(stack.length){
        let [n,path]=stack.pop();
        vis.push(n);
        if(n+""===goal+"") return animate(path,vis);
        neighbors(n).forEach(nb=>{
            if(!visited.has(nb+"")){
                visited.add(nb+"");
                stack.push([nb,[...path,nb]]);
            }
        });
    }
}

// A* con euristica Manhattan
function runAStar(){
    drawMaze();
    let open=[[0,start,[start]]], visited=new Set(), vis=[];
    while(open.length){
        open.sort((a,b)=>a[0]-b[0]);
        let [cost,n,path]=open.shift();
        if(visited.has(n+"")) continue;
        visited.add(n+"");
        vis.push(n);
        if(n+""===goal+"") return animate(path,vis);
        neighbors(n).forEach(nb=>{
            let g=path.length;
            let h=heuristic(nb,goal);
            open.push([g+h,nb,[...path,nb]]);
        });
    }
}

// Disegna iniziale
drawMaze();
