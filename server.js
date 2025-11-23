const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const port = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// --- Game State ---
let players = {};
let partyMultiplier = 1;
let sacrificeCost = 7500;
let socketIdToPlayerId = {};
let isGameUnlocked = false; 
let isExpeditionStarted = false;
let isGameOver = false;

// --- ECONOMY SETTINGS ---
const HELPER_COST = 15;          
const TNT_COST = 250;            
const DRILL_COST = 1000;         
const EXCAVATOR_COST = 15000;    
const POWER_CLICK_COST = 25;     
const CRIT_COST = 500;           
const SYNERGY_COST = 2500;       

const CRACK_COST = 100;
const CAT_COST = 250;
const FLIP_COST = 500;
const GREMLIN_COST = 750;
const HIDDEN_CAT_BONUS = 1000;

// BALANCING: Goal 100 Million
// UPDATED: Now includes 'position' to control which box unlocks
const secretCodeThresholds = [
  // 1. Unlock 'U' (Position 1)
  { score: 250000,   code: 'U', position: 1, revealed: false }, 
  // 2. Unlock 'D' (Position 3)
  { score: 2500000,  code: 'D', position: 3, revealed: false }, 
  // 3. Unlock 'R' (Position 2)
  { score: 15000000, code: 'R', position: 2, revealed: false }, 
  // 4. Unlock 'T' (Position 0) - Final Goal
  { score: 50000000, code: 'T', position: 0, revealed: false } 
];

function broadcastGameState() {
  const nextThresholdObj = secretCodeThresholds.find(t => !t.revealed);
  const nextGoal = nextThresholdObj ? nextThresholdObj.score : 0;

  const gameState = { 
      players, 
      partyMultiplier, 
      sacrificeCost, 
      isGameUnlocked, 
      isExpeditionStarted,
      isGameOver,
      nextGoal 
  };
  io.emit('gameStateUpdate', gameState);
}

function recordAttack(attackerId, targetName, type) {
    const attacker = players[attackerId];
    if (!attacker) return;
    if (!attacker.history[targetName]) {
        attacker.history[targetName] = { cracks: 0, flips: 0, gremlins: 0, cats: 0 };
    }
    attacker.history[targetName][type]++;
}

io.on('connection', (socket) => {
  console.log(`A user connected with ID: ${socket.id}`);
  
  const nextThresholdObj = secretCodeThresholds.find(t => !t.revealed);
  const nextGoal = nextThresholdObj ? nextThresholdObj.score : 0;
  
  socket.emit('gameStateUpdate', { players, partyMultiplier, sacrificeCost, isGameUnlocked, isExpeditionStarted, isGameOver, nextGoal });
  
  // UPDATED: Emit the stored position, not the index
  secretCodeThresholds.forEach((threshold) => {
    if (threshold.revealed) {
      socket.emit('unlockCodePiece', { code: threshold.code, position: threshold.position });
    }
  });

  socket.on('adminResetGame', () => {
    players = {};
    socketIdToPlayerId = {};
    partyMultiplier = 1;
    sacrificeCost = 7500;
    isGameUnlocked = false;
    isExpeditionStarted = false;
    isGameOver = false;
    secretCodeThresholds.forEach(t => t.revealed = false);
    io.emit('forceRefresh');
    console.log("⚠️ GAME HAS BEEN RESET BY ADMIN ⚠️");
  });

  socket.on('joinGame', (data) => {
    const { name, id } = data;
    socketIdToPlayerId[socket.id] = id;
    if (!players[id]) {
      players[id] = { 
          name, 
          score: 0,
          totalEarnedMass: 0,
          clickPower: 1,
          critChance: 0, 
          synergyLevel: 0, 
          helpers: 0, 
          tnt: 0,       
          drills: 0, 
          excavators: 0, 
          totalHelpers: 0,
          totalTnt: 0,
          totalDrills: 0,
          totalExcavators: 0,
          totalClickUpgrades: 0,
          nextHelperCost: HELPER_COST, 
          nextTntCost: TNT_COST,       
          nextDrillCost: DRILL_COST, 
          nextExcavatorCost: EXCAVATOR_COST, 
          nextPowerClickCost: POWER_CLICK_COST,
          nextCritCost: CRIT_COST,       
          nextSynergyCost: SYNERGY_COST, 
          sacrifices: 0,
          attackCost: 0,
          foundSecret: false, 
          history: {}
      };
    } else {
      players[id].name = name;
    }
    broadcastGameState();
  });

  socket.on('unlockGame', () => {
    if (!isGameUnlocked) {
        isGameUnlocked = true;
        broadcastGameState();
    }
  });

  socket.on('startExpedition', () => {
    if (!isExpeditionStarted) {
        isExpeditionStarted = true;
        io.emit('gameUnlocked'); 
        io.emit('announcement', { text: "THE EXCAVATION HAS BEGUN!", duration: 10000, priority: 3 });
        broadcastGameState();
    }
  });

  function getPlayer(socketId) {
    const playerId = socketIdToPlayerId[socketId];
    return players[playerId];
  }

  socket.on('playerClick', () => {
    const player = getPlayer(socket.id);
    if (player && (isExpeditionStarted || !isGameUnlocked) && !isGameOver) {
        const passiveBase = (player.helpers + (player.tnt * 10) + (player.drills * 50) + (player.excavators * 500));
        const synergyBonus = passiveBase * (player.synergyLevel * 0.01);
        let hitValue = (player.clickPower + synergyBonus) * partyMultiplier;
        
        const effectiveCritChance = Math.min(50, player.critChance);
        const isCrit = (Math.random() * 100) < effectiveCritChance;
        if (isCrit) hitValue *= 10; 

        player.score += hitValue;
        player.totalEarnedMass += hitValue;
    }
  });
  
  socket.on('foundHiddenCat', () => {
    const player = getPlayer(socket.id);
    if (player && !player.foundSecret) {
      player.foundSecret = true;
      player.score += HIDDEN_CAT_BONUS;
      player.totalEarnedMass += HIDDEN_CAT_BONUS;
      io.emit('announcement', { text: `${player.name} reflected on themselves to find the hidden secret.`, duration: 5000, priority: 2 });
      broadcastGameState();
    }
  });

  const handleUpgrade = (socket, costProp, countProp, totalProp, scale) => {
      const player = getPlayer(socket.id);
      if (!player) return;
      const cost = player[costProp];
      
      if (player.score >= cost) {
          player.score -= cost;
          player[countProp]++;
          if (totalProp) player[totalProp]++;
          player[costProp] = Math.ceil(cost * scale);
      }
  };

  socket.on('purchaseHelper', () => handleUpgrade(socket, 'nextHelperCost', 'helpers', 'totalHelpers', 1.15));
  socket.on('purchaseTnt', () => handleUpgrade(socket, 'nextTntCost', 'tnt', 'totalTnt', 1.15));
  socket.on('purchaseDrill', () => handleUpgrade(socket, 'nextDrillCost', 'drills', 'totalDrills', 1.15));
  socket.on('purchaseExcavator', () => handleUpgrade(socket, 'nextExcavatorCost', 'excavators', 'totalExcavators', 1.15));
  socket.on('purchasePowerClick', () => handleUpgrade(socket, 'nextPowerClickCost', 'clickPower', 'totalClickUpgrades', 1.15));
  socket.on('purchaseCrit', () => handleUpgrade(socket, 'nextCritCost', 'critChance', null, 1.30));
  socket.on('purchaseSynergy', () => handleUpgrade(socket, 'nextSynergyCost', 'synergyLevel', null, 1.50));

  socket.on('crackPlayer', (targetPlayerId) => {
    const attacker = getPlayer(socket.id);
    if (!attacker || !players[targetPlayerId]) return;

    if (attacker.score >= CRACK_COST && socketIdToPlayerId[socket.id] !== targetPlayerId) {
      attacker.score -= CRACK_COST;
      attacker.attackCost += CRACK_COST;
      
      const targetSocketId = Object.keys(socketIdToPlayerId).find(socketId => socketIdToPlayerId[socketId] === targetPlayerId);
      
      recordAttack(socketIdToPlayerId[socket.id], players[targetPlayerId].name, 'cracks');
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('youGotCracked');
        io.emit('announcement', { text: `${attacker.name} smashed ${players[targetPlayerId].name}'s screen!`, duration: 30000, priority: 1 });
        broadcastGameState();
      }
    }
  });
  
  socket.on('flipPlayer', (targetPlayerId) => {
    const flipper = getPlayer(socket.id);
    if (!flipper || !players[targetPlayerId]) return;

    if (flipper.score >= FLIP_COST && socketIdToPlayerId[socket.id] !== targetPlayerId) {
      flipper.score -= FLIP_COST;
      flipper.attackCost += FLIP_COST;
      
      const targetSocketId = Object.keys(socketIdToPlayerId).find(socketId => socketIdToPlayerId[socketId] === targetPlayerId);
      
      recordAttack(socketIdToPlayerId[socket.id], players[targetPlayerId].name, 'flips');
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('youGotFlipped');
        io.emit('announcement', { text: `${flipper.name} shifted the tectonic plates under ${players[targetPlayerId].name}!`, duration: 15000, priority: 1 });
        broadcastGameState();
      }
    }
  });
  
  socket.on('gremlinPlayer', (targetPlayerId) => {
    const attacker = getPlayer(socket.id);
    if (!attacker || !players[targetPlayerId]) return;

    if (attacker.score >= GREMLIN_COST && socketIdToPlayerId[socket.id] !== targetPlayerId) {
      attacker.score -= GREMLIN_COST;
      attacker.attackCost += GREMLIN_COST;
      
      const targetSocketId = Object.keys(socketIdToPlayerId).find(socketId => socketIdToPlayerId[socketId] === targetPlayerId);
      
      recordAttack(socketIdToPlayerId[socket.id], players[targetPlayerId].name, 'gremlins');
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('youGotGremlined');
        io.emit('announcement', { text: `${attacker.name} opened a fissure under ${players[targetPlayerId].name}!`, duration: 30000, priority: 1 });
        broadcastGameState();
      }
    }
  });

  socket.on('sendCat', (targetPlayerId) => {
    const purchaser = getPlayer(socket.id);
    if (!purchaser || !players[targetPlayerId]) return;

    if (purchaser.score >= CAT_COST && socketIdToPlayerId[socket.id] !== targetPlayerId) {
      purchaser.score -= CAT_COST;
      purchaser.attackCost += CAT_COST;
      
      const targetSocketId = Object.keys(socketIdToPlayerId).find(socketId => socketIdToPlayerId[socketId] === targetPlayerId);
      
      recordAttack(socketIdToPlayerId[socket.id], players[targetPlayerId].name, 'cats');
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('catAttack');
        io.emit('announcement', { text: `${purchaser.name} sent a wandering CAT to ${players[targetPlayerId].name}!`, duration: 10000, priority: 1 });
        broadcastGameState();
      }
    }
  });
  
  socket.on('sacrificeForParty', () => {
    const player = getPlayer(socket.id);
    if (player && player.score >= sacrificeCost) {
      partyMultiplier *= 2;
      sacrificeCost *= 5;
      player.sacrifices++;
      
      io.emit('earthquakeTriggered', { name: player.name, multiplier: partyMultiplier });
      io.emit('announcement', { text: `${player.name} triggered an EARTHQUAKE!`, duration: 5000, priority: 3 });
      
      player.score = 0;
      player.helpers = 0;
      player.tnt = 0; 
      player.drills = 0;
      player.excavators = 0; 
      player.clickPower = 1;
      player.critChance = 0;
      player.synergyLevel = 0;
      
      player.nextHelperCost = HELPER_COST;
      player.nextTntCost = TNT_COST;
      player.nextDrillCost = DRILL_COST;
      player.nextExcavatorCost = EXCAVATOR_COST;
      player.nextPowerClickCost = POWER_CLICK_COST;
      player.nextCritCost = CRIT_COST;
      player.nextSynergyCost = SYNERGY_COST;
      
      broadcastGameState();
    }
  });

  socket.on('disconnect', () => {
    if (socketIdToPlayerId[socket.id]) {
        const playerId = socketIdToPlayerId[socket.id];
        console.log(`User ${playerId} disconnected.`);
        delete socketIdToPlayerId[socket.id];
    }
  });
});

setInterval(() => {
  let totalScore = 0;
  for (const id in players) {
    const player = players[id];
    if (isExpeditionStarted && !isGameOver) {
        const gain = (player.helpers + (player.tnt * 10) + (player.drills * 50) + (player.excavators * 500)) * partyMultiplier;
        if (!isNaN(gain)) {
            player.score += gain;
            player.totalEarnedMass += gain;
        }
    }
    totalScore += player.score;
  }
  
  secretCodeThresholds.forEach((threshold) => {
    // UPDATED: Check if not already revealed, otherwise we spam messages
    if (totalScore >= threshold.score && !threshold.revealed) {
      threshold.revealed = true;
      // UPDATED: Emit the SPECIFIC position from the object
      io.emit('unlockCodePiece', { code: threshold.code, position: threshold.position });
      
      // Check if this was the final threshold in the list
      if (threshold === secretCodeThresholds[secretCodeThresholds.length - 1] && !isGameOver) {
          isGameOver = true;
          // UPDATED: Hardcode the final word to ensure correct display
          const fullCode = "TURD"; 
          io.emit('gameOver', { players, fullCode });
          broadcastGameState();
      }
    }
  });
  broadcastGameState();
}, 1000);

httpServer.listen(port, () => { console.log(`✅ SERVER UPDATED! Running on port ${port}`); });