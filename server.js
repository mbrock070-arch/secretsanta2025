const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const port = process.env.PORT || 3000;

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Force index.html on root load
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- CONFIGURATION ---
const CONSTANTS = {
    SYNERGY_PER_LEVEL: 0.02, // 2%
    HIDDEN_CAT_BASE: 50000,
    CRIT_CHANCE_CAP: 50
};

const THRESHOLDS = [
    { score: 250000, code: 'U', position: 1, revealed: false },        // 250k
    { score: 25000000, code: 'D', position: 3, revealed: false },      // 25 Million
    { score: 2500000000, code: 'R', position: 2, revealed: false },    // 2.5 Billion
    { score: 250000000000, code: 'T', position: 0, revealed: false }   // 250 Billion
];

const COSTS = {
    HELPER: 15,
    TNT: 250,
    HAMMER: 500,
    DRILL: 1000,
    CRIT: 500,
    SYNERGY: 10000,
    EXCAVATOR: 15000,
    POWER_CLICK: 25,
    SACRIFICE_START: 7500
};

const ATTACKS = {
    CRACK: 100,
    CAT: 250,
    FLIP: 500,
    GREMLIN: 750
};

// --- GAME STATE ---
let players = {};
let socketIdToPlayerId = {};
let partyMultiplier = 1;
let sacrificeCost = COSTS.SACRIFICE_START;
let isGameUnlocked = false; 
let isExpeditionStarted = false;
let isGameOver = false;

// --- HELPERS ---
function getPlayer(socketId) {
    const playerId = socketIdToPlayerId[socketId];
    return players[playerId];
}

function broadcastGameState() {
    const nextThresholdObj = THRESHOLDS.find(t => !t.revealed);
    const nextGoal = nextThresholdObj ? nextThresholdObj.score : 0;

    const thresholdData = THRESHOLDS.map(t => ({
        score: t.score,
        position: t.position,
        revealed: t.revealed
    }));

    io.emit('gameStateUpdate', {
        players,
        partyMultiplier,
        sacrificeCost,
        isGameUnlocked,
        isExpeditionStarted,
        isGameOver,
        nextGoal,
        thresholds: thresholdData
    });
}

function recordAttack(attackerId, targetName, type) {
    const attacker = players[attackerId];
    if (!attacker) return;
    if (!attacker.history) attacker.history = {};
    if (!attacker.history[targetName]) {
        attacker.history[targetName] = { cracks: 0, flips: 0, gremlins: 0, cats: 0 };
    }
    attacker.history[targetName][type]++;
}

// --- SOCKET LOGIC ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Send initial state
    broadcastGameState();
    
    // Re-send unlocked codes to anyone joining late/reconnecting
    THRESHOLDS.forEach((threshold) => {
        if (threshold.revealed) {
            socket.emit('unlockCodePiece', { code: threshold.code, position: threshold.position });
        }
    });

    socket.on('joinGame', (data) => {
        const { name, id } = data;
        socketIdToPlayerId[socket.id] = id;
        
        if (!players[id]) {
            players[id] = { 
                name: name.substring(0, 15), 
                score: 0,
                totalEarnedMass: 0,
                
                // Inventory
                helpers: 0, tnt: 0, drills: 0, excavators: 0, 
                
                // Stats
                clickPower: 1,
                critChance: 0, 
                synergyLevel: 0, 
                
                // Costs
                nextHelperCost: COSTS.HELPER, 
                nextTntCost: COSTS.TNT,
                nextHammerCost: COSTS.HAMMER,      
                nextDrillCost: COSTS.DRILL, 
                nextExcavatorCost: COSTS.EXCAVATOR, 
                nextPowerClickCost: COSTS.POWER_CLICK,
                nextCritCost: COSTS.CRIT,       
                nextSynergyCost: COSTS.SYNERGY, 
                
                // Tracking
                totalHelpers: 0, totalTnt: 0, totalDrills: 0, totalExcavators: 0,
                totalClickUpgrades: 0, totalHammerUpgrades: 0, 
                totalClicks: 0, sacrifices: 0, attackCost: 0,
                foundSecret: false, history: {}
            };
        } else {
            players[id].name = name.substring(0, 15);
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
            isGameUnlocked = true; // Ensure unlock is true
            io.emit('gameUnlocked'); 
            io.emit('announcement', { text: "THE EXCAVATION HAS BEGUN!", duration: 10000, priority: 3 });
            broadcastGameState();
        }
    });

    socket.on('playerClick', () => {
        const player = getPlayer(socket.id);
        // Allow clicking if: Game Started OR (Game Not Unlocked Yet = Tutorial) OR (Score < 100 = Stuck in Lobby fix)
        if (player && !isGameOver) {
            const canMine = isExpeditionStarted || !isGameUnlocked || player.score < 100;
            
            if (canMine) {
                player.totalClicks = (player.totalClicks || 0) + 1;
                
                const passiveBase = (player.helpers * 1) + (player.tnt * 10) + (player.drills * 50) + (player.excavators * 500);
                const synergyBonus = passiveBase * (player.synergyLevel * CONSTANTS.SYNERGY_PER_LEVEL);
                let hitValue = (player.clickPower + synergyBonus) * partyMultiplier;
                
                const effectiveCritChance = Math.min(CONSTANTS.CRIT_CHANCE_CAP, player.critChance);
                if (Math.random() * 100 < effectiveCritChance) {
                    hitValue *= 10; 
                }

                if (isNaN(hitValue)) hitValue = 1;

                player.score += hitValue;
                player.totalEarnedMass += hitValue;
            }
        }
    });
    
    socket.on('foundHiddenCat', () => {
        const player = getPlayer(socket.id);
        if (player && !player.foundSecret) {
            player.foundSecret = true;
            const bonus = CONSTANTS.HIDDEN_CAT_BASE * partyMultiplier;
            player.score += bonus;
            player.totalEarnedMass += bonus;
            io.emit('announcement', { text: `${player.name} found a secret fossil stash! (+${bonus.toLocaleString()})`, duration: 5000, priority: 2 });
            broadcastGameState();
        }
    });

    // Upgrade Handlers
    const handleUpgrade = (socket, costProp, countProp, totalProp, scale) => {
        const player = getPlayer(socket.id);
        if (!player) return;
        if (!player[costProp]) player[costProp] = 100; 
        if (!player[countProp]) player[countProp] = 0;
        
        const cost = player[costProp];
        
        if (player.score >= cost) {
            player.score -= cost;
            player[countProp]++;
            if (totalProp) {
                if (!player[totalProp]) player[totalProp] = 0;
                player[totalProp]++;
            }
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
    
    socket.on('purchaseHammer', () => {
        const player = getPlayer(socket.id);
        if (!player) return;
        if (!player.nextHammerCost) player.nextHammerCost = COSTS.HAMMER;
        
        if (player.score >= player.nextHammerCost) {
            player.score -= player.nextHammerCost;
            player.clickPower += 10; 
            player.totalHammerUpgrades = (player.totalHammerUpgrades || 0) + 1;
            player.nextHammerCost = Math.ceil(player.nextHammerCost * 1.5);
        }
    });

    // Attacks
    const handleAttack = (socket, targetId, cost, type, msg, eventName) => {
        const attacker = getPlayer(socket.id);
        if (attacker && attacker.score >= cost && socketIdToPlayerId[socket.id] !== targetId) {
            attacker.score -= cost;
            attacker.attackCost = (attacker.attackCost || 0) + cost;
            
            const targetSocketId = Object.keys(socketIdToPlayerId).find(socketId => socketIdToPlayerId[socketId] === targetId);
            const targetPlayer = players[targetId];
            if (targetPlayer) {
                recordAttack(socketIdToPlayerId[socket.id], targetPlayer.name, type);
            }
            
            if (targetSocketId) {
                io.to(targetSocketId).emit(eventName);
                io.emit('announcement', { text: msg.replace('{attacker}', attacker.name).replace('{target}', targetPlayer ? targetPlayer.name : 'someone'), duration: 5000, priority: 1 });
                broadcastGameState();
            }
        }
    };

    socket.on('crackPlayer', (tid) => handleAttack(socket, tid, ATTACKS.CRACK, 'cracks', '{attacker} smashed {target}\'s screen!', 'youGotCracked'));
    socket.on('flipPlayer', (tid) => handleAttack(socket, tid, ATTACKS.FLIP, 'flips', '{attacker} flipped {target}\'s world!', 'youGotFlipped'));
    socket.on('gremlinPlayer', (tid) => handleAttack(socket, tid, ATTACKS.GREMLIN, 'gremlins', '{attacker} unleashed a fissure on {target}!', 'youGotGremlined'));
    socket.on('sendCat', (tid) => handleAttack(socket, tid, ATTACKS.CAT, 'cats', '{attacker} sent a cat to {target}!', 'catAttack'));
    
    socket.on('sacrificeForParty', () => {
        const player = getPlayer(socket.id);
        if (player && player.score >= sacrificeCost) {
            
            // Exponential (Doubling)
            partyMultiplier *= 2;
            
            sacrificeCost *= 5;
            player.sacrifices++;
            
            io.emit('earthquakeTriggered', { name: player.name, multiplier: partyMultiplier });
            io.emit('announcement', { text: `${player.name} triggered an EARTHQUAKE! (Multiplier DOUBLED!)`, duration: 5000, priority: 3 });
            
            // Reset Player
            player.score = 0;
            player.helpers = 0; player.tnt = 0; player.drills = 0; player.excavators = 0; 
            player.clickPower = 1; player.critChance = 0; player.synergyLevel = 0;
            player.totalClickUpgrades = 0; player.totalHammerUpgrades = 0;
            
            // Reset Costs
            player.nextHelperCost = COSTS.HELPER;
            player.nextTntCost = COSTS.TNT;
            player.nextDrillCost = COSTS.DRILL;
            player.nextExcavatorCost = COSTS.EXCAVATOR;
            player.nextPowerClickCost = COSTS.POWER_CLICK;
            player.nextHammerCost = COSTS.HAMMER;
            player.nextCritCost = COSTS.CRIT;
            player.nextSynergyCost = COSTS.SYNERGY;
            
            broadcastGameState();
        }
    });

    // Admin & System
    socket.on('adminResetGame', () => {
        players = {};
        socketIdToPlayerId = {};
        partyMultiplier = 1;
        sacrificeCost = COSTS.SACRIFICE_START;
        isGameUnlocked = false;
        isExpeditionStarted = false;
        isGameOver = false;
        THRESHOLDS.forEach(t => t.revealed = false);
        io.emit('forceRefresh');
        console.log("⚠️ GAME HAS BEEN RESET BY ADMIN ⚠️");
    });

    // Cheat for testing (Remove if not needed, but useful for you now)
    socket.on('dev_grant_mass', (amount) => {
        const player = getPlayer(socket.id);
        if (player) {
            player.score += amount;
            player.totalEarnedMass += amount;
            broadcastGameState();
        }
    });

    socket.on('disconnect', () => {
        if (socketIdToPlayerId[socket.id]) {
            const playerId = socketIdToPlayerId[socket.id];
            delete socketIdToPlayerId[socket.id];
        }
    });
});

// Main Loop
setInterval(() => {
    let totalScore = 0;
    for (const id in players) {
        const player = players[id];
        if (isExpeditionStarted && !isGameOver) {
            const gain = (player.helpers * 1 + player.tnt * 10 + player.drills * 50 + player.excavators * 500) * partyMultiplier;
            if (!isNaN(gain)) {
                player.score += gain;
                player.totalEarnedMass += gain;
            }
        }
        totalScore += player.score;
    }
    
    THRESHOLDS.forEach((threshold, index) => {
        if (totalScore >= threshold.score && !threshold.revealed) {
            threshold.revealed = true;
            io.emit('unlockCodePiece', { code: threshold.code, position: threshold.position });
            
            if (index === THRESHOLDS.length - 1 && !isGameOver) {
                isGameOver = true;
                const fullCode = [...THRESHOLDS].sort((a, b) => a.position - b.position).map(t => t.code).join('');
                io.emit('gameOver', { players, fullCode });
                broadcastGameState();
            }
        }
    });
    broadcastGameState();
}, 1000);

httpServer.listen(port, () => { console.log(`✅ MONOLITH SERVER RUNNING on port ${port}`); });