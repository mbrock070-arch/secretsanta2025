const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const Config = require('./gameConfig');
const Game = require('./gameLogic');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Explicit index route to be safe
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let socketIdToPlayerId = {};

// --- HELPER: Broadcast ---
function broadcastGameState() {
    const nextThresholdObj = Config.THRESHOLDS.find(t => !t.revealed);
    const nextGoal = nextThresholdObj ? nextThresholdObj.score : 0;

    const thresholdData = Config.THRESHOLDS.map(t => ({
        score: t.score,
        position: t.position,
        revealed: t.revealed
    }));

    io.emit('gameStateUpdate', {
        players: Game.players,
        partyMultiplier: Game.getMultiplier(),
        sacrificeCost: Game.getSacrificeCost(),
        isGameUnlocked: Game.isGameUnlocked,
        isExpeditionStarted: Game.isExpeditionStarted,
        isGameOver: Game.isGameOver,
        nextGoal,
        thresholds: thresholdData
    });
}

function handleUpgrade(socket, costProp, countProp, totalProp, scale) {
    const player = Game.getPlayer(socket.id, socketIdToPlayerId);
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
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    broadcastGameState();
    Config.THRESHOLDS.forEach(t => {
        if(t.revealed) socket.emit('unlockCodePiece', { code: t.code, position: t.position });
    });

    socket.on('joinGame', (data) => {
        socketIdToPlayerId[socket.id] = data.id;
        Game.initPlayer(data.id, data.name);
        broadcastGameState();
    });

    socket.on('startExpedition', () => {
        if (!Game.isExpeditionStarted) {
            Game.setExpeditionStarted(true);
            Game.setGameUnlocked(true); 
            io.emit('gameUnlocked');
            io.emit('announcement', { text: "THE EXCAVATION HAS BEGUN!", duration: 10000, priority: 3 });
            broadcastGameState();
        }
    });

    socket.on('playerClick', () => {
        const player = Game.getPlayer(socket.id, socketIdToPlayerId);
        if (player && (Game.isExpeditionStarted || !Game.isGameUnlocked) && !Game.isGameOver) {
            // Track total clicks for awards
            player.totalClicks = (player.totalClicks || 0) + 1;

            const passive = (player.helpers * 1) + (player.tnt * 10) + (player.drills * 50) + (player.excavators * 500);
            const synergy = passive * (player.synergyLevel * Config.CONSTANTS.SYNERGY_PER_LEVEL);
            let hit = (player.clickPower + synergy) * Game.getMultiplier();

            const chance = Math.min(Config.CONSTANTS.CRIT_CHANCE_CAP, player.critChance);
            if (Math.random() * 100 < chance) hit *= 10;

            player.score += hit;
            player.totalEarnedMass += hit;
        }
    });

    // --- UPGRADES ---
    socket.on('purchaseHelper', () => handleUpgrade(socket, 'nextHelperCost', 'helpers', 'totalHelpers', 1.15));
    socket.on('purchaseTnt', () => handleUpgrade(socket, 'nextTntCost', 'tnt', 'totalTnt', 1.15));
    socket.on('purchaseDrill', () => handleUpgrade(socket, 'nextDrillCost', 'drills', 'totalDrills', 1.15));
    socket.on('purchaseExcavator', () => handleUpgrade(socket, 'nextExcavatorCost', 'excavators', 'totalExcavators', 1.15));
    socket.on('purchasePowerClick', () => handleUpgrade(socket, 'nextPowerClickCost', 'clickPower', 'totalClickUpgrades', 1.15));
    socket.on('purchaseCrit', () => handleUpgrade(socket, 'nextCritCost', 'critChance', null, 1.30));
    socket.on('purchaseSynergy', () => handleUpgrade(socket, 'nextSynergyCost', 'synergyLevel', null, 1.50));
    
    socket.on('purchaseHammer', () => {
        const player = Game.getPlayer(socket.id, socketIdToPlayerId);
        if (!player) return;
        if (player.score >= player.nextHammerCost) {
            player.score -= player.nextHammerCost;
            player.clickPower += 10;
            player.totalHammerUpgrades = (player.totalHammerUpgrades || 0) + 1;
            player.nextHammerCost = Math.ceil(player.nextHammerCost * 1.5);
        }
    });

    socket.on('sacrificeForParty', () => {
        const player = Game.getPlayer(socket.id, socketIdToPlayerId);
        if (player && player.score >= Game.getSacrificeCost()) {
            let currentMult = Game.getMultiplier();
            Game.setMultiplier(currentMult * 2); // Exponential Doubling
            
            Game.multiplySacrificeCost(5);
            player.sacrifices++;

            io.emit('earthquakeTriggered', { name: player.name, multiplier: Game.getMultiplier() });
            io.emit('announcement', { text: `${player.name} triggered an EARTHQUAKE! Multiplier DOUBLED!`, duration: 5000, priority: 3 });

            // Reset Player
            player.score = 0;
            player.helpers = 0; player.tnt = 0; player.drills = 0; player.excavators = 0;
            player.clickPower = 1; player.critChance = 0; player.synergyLevel = 0;
            
            // Reset tracked counts so "Owned" numbers go back to 0
            player.totalClickUpgrades = 0;
            player.totalHammerUpgrades = 0;
            
            // Reset Costs
            player.nextHelperCost = Config.COSTS.HELPER;
            player.nextTntCost = Config.COSTS.TNT;
            player.nextDrillCost = Config.COSTS.DRILL;
            player.nextExcavatorCost = Config.COSTS.EXCAVATOR;
            player.nextPowerClickCost = Config.COSTS.POWER_CLICK;
            player.nextHammerCost = Config.COSTS.HAMMER;
            player.nextCritCost = Config.COSTS.CRIT;
            player.nextSynergyCost = Config.COSTS.SYNERGY;

            broadcastGameState();
        }
    });

    const handleAttack = (socket, targetId, cost, type, msg, eventName) => {
        const attacker = Game.getPlayer(socket.id, socketIdToPlayerId);
        if (attacker && attacker.score >= cost && socketIdToPlayerId[socket.id] !== targetId) {
            attacker.score -= cost;
            attacker.attackCost = (attacker.attackCost || 0) + cost;
            
            const targetSocket = Object.keys(socketIdToPlayerId).find(sid => socketIdToPlayerId[sid] === targetId);
            const targetPlayer = Game.players[targetId];
            if (targetPlayer) {
                if (!attacker.history[targetPlayer.name]) attacker.history[targetPlayer.name] = { cracks: 0, flips: 0, gremlins: 0, cats: 0 };
                attacker.history[targetPlayer.name][type]++;
            }

            if (targetSocket) {
                io.to(targetSocket).emit(eventName);
                io.emit('announcement', { text: msg.replace('{attacker}', attacker.name).replace('{target}', targetPlayer?.name || 'someone'), duration: 5000, priority: 1 });
                broadcastGameState();
            }
        }
    };

    socket.on('crackPlayer', (tid) => handleAttack(socket, tid, Config.ATTACKS.CRACK, 'cracks', '{attacker} smashed {target}\'s screen!', 'youGotCracked'));
    socket.on('flipPlayer', (tid) => handleAttack(socket, tid, Config.ATTACKS.FLIP, 'flips', '{attacker} flipped {target}\'s world!', 'youGotFlipped'));
    socket.on('gremlinPlayer', (tid) => handleAttack(socket, tid, Config.ATTACKS.GREMLIN, 'gremlins', '{attacker} unleashed a fissure on {target}!', 'youGotGremlined'));
    socket.on('sendCat', (tid) => handleAttack(socket, tid, Config.ATTACKS.CAT, 'cats', '{attacker} sent a cat to {target}!', 'catAttack'));

    socket.on('foundHiddenCat', () => {
        const player = Game.getPlayer(socket.id, socketIdToPlayerId);
        if (player && !player.foundSecret) {
            player.foundSecret = true;
            const bonus = Config.CONSTANTS.HIDDEN_CAT_BASE * Game.getMultiplier();
            player.score += bonus;
            player.totalEarnedMass += bonus;
            io.emit('announcement', { text: `${player.name} found the secret! (+${bonus.toLocaleString()})`, duration: 5000, priority: 2 });
            broadcastGameState();
        }
    });

    socket.on('adminResetGame', () => {
        Game.resetGame();
        socketIdToPlayerId = {};
        io.emit('forceRefresh');
    });

    socket.on('disconnect', () => {
        delete socketIdToPlayerId[socket.id];
    });
});

setInterval(() => {
    let totalScore = 0;
    for (const id in Game.players) {
        const player = Game.players[id];
        if (Game.isExpeditionStarted && !Game.isGameOver) {
            const gain = (player.helpers * 1 + player.tnt * 10 + player.drills * 50 + player.excavators * 500) * Game.getMultiplier();
            if (!isNaN(gain)) {
                player.score += gain;
                player.totalEarnedMass += gain;
            }
        }
        totalScore += player.score;
    }

    Config.THRESHOLDS.forEach((t, index) => {
        if (totalScore >= t.score && !t.revealed) {
            t.revealed = true;
            io.emit('unlockCodePiece', { code: t.code, position: t.position });

            if (index === Config.THRESHOLDS.length - 1 && !Game.isGameOver) {
                Game.setGameOver(true);
                const fullCode = [...Config.THRESHOLDS].sort((a, b) => a.position - b.position).map(x => x.code).join('');
                io.emit('gameOver', { players: Game.players, fullCode });
                broadcastGameState();
            }
        }
    });
    broadcastGameState();
}, 1000);

httpServer.listen(port, () => console.log(`✅ Modular Server running on port ${port}`));