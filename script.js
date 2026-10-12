/*
  PERSONALIZACIÓN OPCIONAL:
  Para activar la confirmación por WhatsApp, coloca el número de la familia
  con código de país y solo dígitos, por ejemplo: const WHATSAPP_NUMBER = "519XXXXXXXX";
  No se ha configurado ningún número porque no fue proporcionado.
*/
const WHATSAPP_NUMBER = "51907927669";
const $ = (id) => document.getElementById(id);
document.querySelectorAll(".character img, .bowser-big img, .invite-characters img").forEach(image=>{
  image.addEventListener("error",()=>{
    image.hidden=true;
    const fallback=image.nextElementSibling;
    if(fallback)fallback.hidden=false;
  });
});
const screens = ["welcome","intro","games","victory","invitation"];
let level = 0, soundOn = false, audioCtx = null;
const stars = [false,false,false];
let playerPosition = 15, treasureTiles = new Set(), mazePosition = 20;
let memoryCards = [], openCards = [], matchedCards = new Set(), memoryLocked = false;
let memoryTimeout = null;
const MAZE_SIZE = 9;
let mazeOpenTiles = new Set();

function showScreen(id){
  if(id!=="games"&&memoryTimeout){clearTimeout(memoryTimeout);memoryTimeout=null}
  screens.forEach(s => $(s).hidden = s !== id);
  window.scrollTo({top:0,behavior:"smooth"});
}
function beep(freq=660,duration=.09){
  if(!soundOn) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
    osc.frequency.value=freq; osc.type="sine"; gain.gain.value=.055;
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
    osc.stop(audioCtx.currentTime+duration);
  }catch(e){}
}
$("soundToggle").addEventListener("click",()=>{
  soundOn=!soundOn;
  $("soundToggle").textContent=soundOn?"🔊 Sonido activado":"🔇 Sonido apagado";
  $("soundToggle").setAttribute("aria-pressed",String(soundOn));
  if(soundOn) beep(740,.12);
});
$("startBtn").addEventListener("click",()=>{beep(550);showScreen("intro")});
$("beginGames").addEventListener("click",()=>{level=0;caught=0;stars.fill(false);updateProgress();showScreen("games");renderGame()});
$("skipBtn").addEventListener("click",()=>{showScreen("invitation");confetti()});
$("continueBtn").addEventListener("click",()=>{
  if(level<2){level++;renderGame()}else{showScreen("victory");confetti()}
});
$("revealBtn").addEventListener("click",()=>{showScreen("invitation");confetti();beep(880,.2)});
$("restartBtn").addEventListener("click",()=>{level=0;caught=0;stars.fill(false);updateProgress();showScreen("welcome")});

function updateProgress(){
  stars.forEach((done,i)=>{
    const slot=$("p"+i);
    slot.classList.toggle("done",done);
    slot.querySelector("img").alt=done?"Estrella conseguida":"Estrella pendiente";
  });
  $("progressText").textContent=stars.filter(Boolean).length+" de 3 estrellas mágicas";
}
function completeLevel(message){
  stars[level]=true;updateProgress();beep(820,.15);
  $("feedback").textContent=message;
  $("continueBtn").hidden=false;
}
function renderGame(){
  if(memoryTimeout){clearTimeout(memoryTimeout);memoryTimeout=null}
  $("continueBtn").hidden=true;$("feedback").textContent="";$("gameBoard").innerHTML="";
  $("gameBoard").className="game-board "+["adventure-world","maze-world","memory-world"][level];
  $("levelKicker").textContent="MUNDO 1-"+(level+1)+" · DESAFÍO "+(level+1)+" DE 3";
  if(level===0){
    $("gameTitle").textContent="¡Explora y recoge!";
    $("gameDescription").textContent="Muévete por el nivel para recoger las cinco estrellas.";
    $("gamePrompt").textContent="Usa las flechas del tablero o del teclado para mover a Peach.";
    playerPosition=15;
    treasureTiles=new Set();
    while(treasureTiles.size<5){
      const tile=Math.floor(Math.random()*20);
      if(tile!==playerPosition)treasureTiles.add(tile);
    }
    renderAdventureBoard();
  }else if(level===1){
    $("gameTitle").textContent="El laberinto de las tuberías";
    $("gameDescription").textContent="Cruza este laberinto más grande y encuentra el camino hasta el castillo.";
    $("gamePrompt").textContent="Hay caminos sin salida. Planea tu ruta con las flechas o los controles.";
    createMaze();
    renderMazeBoard();
  }else{
    $("gameTitle").textContent="Memoria de bloques";
    $("gameDescription").textContent="Encuentra las cuatro parejas de bloques iguales.";
    $("gamePrompt").textContent="Toca dos bloques por turno y recuerda dónde está cada figura.";
    const symbols=["🍄","estrella","🌸","🍑"];
    memoryCards=[...symbols,...symbols];
    for(let i=memoryCards.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [memoryCards[i],memoryCards[j]]=[memoryCards[j],memoryCards[i]];
    }
    openCards=[];matchedCards=new Set();memoryLocked=false;
    renderMemoryBoard();
  }
}
function addMovementControls(){
  const pad=document.createElement("div");
  pad.className="movement-pad";
  [["↑","up","Mover arriba"],["←","left","Mover a la izquierda"],["↓","down","Mover abajo"],["→","right","Mover a la derecha"]].forEach(([label,direction,description])=>{
    const button=document.createElement("button");
    button.type="button";button.className="direction-btn";button.textContent=label;
    button.setAttribute("aria-label",description);
    button.addEventListener("click",()=>movePlayer(direction));
    pad.appendChild(button);
  });
  $("gameBoard").appendChild(pad);
}
function renderAdventureBoard(){
  const grid=document.createElement("div");
  grid.className="adventure-grid";
  for(let tile=0;tile<20;tile++){
    const cell=document.createElement("div");
    cell.className="adventure-tile"+(tile===playerPosition?" player-tile":"");
    if(tile===playerPosition){
      cell.textContent="👸🏻";
      cell.setAttribute("aria-label","Peach");
    }else if(treasureTiles.has(tile)){
      const star=document.createElement("img");
      star.src="assets/estrella-ui.png";
      star.alt="";
      star.className="collectible-star";
      cell.appendChild(star);
      cell.setAttribute("aria-label","Estrella para recoger");
    }
    grid.appendChild(cell);
  }
  $("gameBoard").replaceChildren(grid);
  addMovementControls();
}
function createMaze(){
  const cellKey=(row,column)=>row*MAZE_SIZE+column;
  const startTile=cellKey(8,1),goalTile=cellKey(0,7);
  while(true){
    const passages=new Set(),visited=new Set();
    const start={row:7,column:1};
    const stack=[start];
    visited.add(cellKey(start.row,start.column));
    passages.add(cellKey(start.row,start.column));
    while(stack.length){
      const current=stack[stack.length-1];
      const neighbors=[
        {row:current.row-2,column:current.column},
        {row:current.row+2,column:current.column},
        {row:current.row,column:current.column-2},
        {row:current.row,column:current.column+2}
      ].filter(next=>next.row>0&&next.row<MAZE_SIZE-1&&next.column>0&&next.column<MAZE_SIZE-1&&!visited.has(cellKey(next.row,next.column)));
      if(!neighbors.length){stack.pop();continue}
      const next=neighbors[Math.floor(Math.random()*neighbors.length)];
      passages.add(cellKey((current.row+next.row)/2,(current.column+next.column)/2));
      passages.add(cellKey(next.row,next.column));
      visited.add(cellKey(next.row,next.column));
      stack.push(next);
    }
    passages.add(startTile);passages.add(goalTile);
    const distances=new Map([[startTile,0]]),queue=[startTile];
    for(let index=0;index<queue.length;index++){
      const tile=queue[index],row=Math.floor(tile/MAZE_SIZE),column=tile%MAZE_SIZE;
      const neighbors=[
        {row:row-1,column},{row:row+1,column},
        {row,column:column-1},{row,column:column+1}
      ].filter(next=>next.row>=0&&next.row<MAZE_SIZE&&next.column>=0&&next.column<MAZE_SIZE);
      for(const next of neighbors){
        const nextTile=cellKey(next.row,next.column);
        if(!passages.has(nextTile)||distances.has(nextTile))continue;
        distances.set(nextTile,distances.get(tile)+1);queue.push(nextTile);
      }
    }
    if((distances.get(goalTile)||0)>=24){
      mazeOpenTiles=passages;
      mazePosition=startTile;
      return;
    }
  }
}
function renderMazeBoard(){
  const grid=document.createElement("div");
  grid.className="maze-grid";
  for(let tile=0;tile<MAZE_SIZE*MAZE_SIZE;tile++){
    const cell=document.createElement("div");
    const isOpen=mazeOpenTiles.has(tile);
    const isCastle=tile===7;
    cell.className="maze-cell"+(isOpen?"":" wall")+(tile===mazePosition?" player-tile":"")+(isCastle?" castle-tile":"");
    cell.textContent=tile===mazePosition?"👸🏻":isCastle?"🏰":isOpen?"":"🧱";
    grid.appendChild(cell);
  }
  $("gameBoard").replaceChildren(grid);
  addMovementControls();
}
function renderMemoryBoard(){
  const grid=document.createElement("div");
  grid.className="memory-grid";
  memoryCards.forEach((symbol,index)=>{
    const card=document.createElement("button");
    const isVisible=openCards.includes(index)||matchedCards.has(index);
    card.type="button";card.className="memory-card"+(isVisible?" flipped":"")+(matchedCards.has(index)?" matched":"");
    if(isVisible&&symbol==="estrella"){
      const star=document.createElement("img");
      star.src="assets/estrella-ui.png";
      star.alt="";
      card.appendChild(star);
    }else card.textContent=isVisible?symbol:"?";
    card.setAttribute("aria-label",isVisible?"Bloque "+(index+1)+": "+(symbol==="estrella"?"estrella":symbol):"Bloque oculto "+(index+1));
    card.disabled=matchedCards.has(index)||memoryLocked;
    card.addEventListener("click",()=>flipMemoryCard(index));
    grid.appendChild(card);
  });
  $("gameBoard").replaceChildren(grid);
}
function movePlayer(direction){
  if(!$("continueBtn").hidden)return;
  const position=level===0?playerPosition:mazePosition;
  const width=level===0?5:MAZE_SIZE, height=level===0?4:MAZE_SIZE;
  const row=Math.floor(position/width),column=position%width;
  const nextRow=row+(direction==="down"?1:direction==="up"?-1:0);
  const nextColumn=column+(direction==="right"?1:direction==="left"?-1:0);
  if(nextRow<0||nextRow>=height||nextColumn<0||nextColumn>=width)return;
  const nextPosition=nextRow*width+nextColumn;
  if(level===0){
    playerPosition=nextPosition;
    if(treasureTiles.delete(nextPosition)){
      beep(680,.08);
      $("feedback").textContent="¡Estrella recogida! Te faltan "+treasureTiles.size+".";
    }
    renderAdventureBoard();
    if(treasureTiles.size===0)completeLevel("¡Has recogido todas las estrellas! ¡La primera es tuya!");
  }else if(level===1){
    if(!mazeOpenTiles.has(nextPosition)){
      $("feedback").textContent="¡Esa tubería está bloqueada! Busca otro camino.";
      beep(230,.1);return;
    }
    mazePosition=nextPosition;renderMazeBoard();beep(440,.05);
    if(mazePosition===7)completeLevel("¡Llegaste al castillo! ¡La segunda estrella es tuya!");
  }
}
function flipMemoryCard(index){
  if(memoryLocked||matchedCards.has(index)||openCards.includes(index))return;
  openCards.push(index);renderMemoryBoard();beep(540,.06);
  if(openCards.length<2)return;
  const [first,second]=openCards;
  if(memoryCards[first]===memoryCards[second]){
    matchedCards.add(first);matchedCards.add(second);openCards=[];
    renderMemoryBoard();beep(780,.12);
    $("feedback").textContent="¡Pareja encontrada! "+(matchedCards.size/2)+" de 4.";
    if(matchedCards.size===memoryCards.length)completeLevel("¡Memoria perfecta! Has ganado la última estrella.");
  }else{
    memoryLocked=true;$("feedback").textContent="No son iguales. ¡Intenta recordar dónde estaba cada figura!";
    memoryTimeout=window.setTimeout(()=>{
      openCards=[];memoryLocked=false;memoryTimeout=null;renderMemoryBoard();
    },900);
  }
}
window.addEventListener("keydown",event=>{
  const keys={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
  if(!$("games").hidden&&keys[event.key]&&(level===0||level===1)){
    event.preventDefault();movePlayer(keys[event.key]);
  }
});
function confetti(){
  const colors=["#f6b8d2","#ffd65c","#78c86a","#8ac7ff","#d94f94","#ffffff"];
  for(let i=0;i<65;i++){
    const el=document.createElement("i");el.className="confetti";
    el.style.left=Math.random()*100+"vw";el.style.background=colors[Math.floor(Math.random()*colors.length)];
    el.style.animationDelay=Math.random()*.8+"s";el.style.transform="rotate("+Math.random()*360+"deg)";
    document.body.appendChild(el);setTimeout(()=>el.remove(),3800);
  }
}
$("rsvpBtn").addEventListener("click",()=>{
  if(!WHATSAPP_NUMBER){
    $("rsvpNote").textContent="Para activar esta confirmación, configura el número de WhatsApp de la familia en el código. También puedes compartir la invitación directamente.";
    return;
  }
  const msg=encodeURIComponent("¡Hola! Confirmo mi asistencia al cumpleaños de Rafaella el 21 de noviembre de 2026 a las 16:30 en el Círculo Militar.");
  window.open("https://wa.me/"+WHATSAPP_NUMBER+"?text="+msg,"_blank","noopener,noreferrer");
});
$("calendarBtn").addEventListener("click",()=>{
  const calendarUrl=new URL("https://calendar.google.com/calendar/render");
  calendarUrl.search=new URLSearchParams({
    action:"TEMPLATE",
    text:"Cumpleaños de Rafaella",
    dates:"20261121T163000/20261121T173000",
    ctz:"America/Lima",
    details:"¡Te esperamos para celebrar el cumpleaños de Rafaella!",
    location:"Círculo Militar de Chorrillos"
  }).toString();
  window.open(calendarUrl.toString(),"_blank","noopener,noreferrer");
});
