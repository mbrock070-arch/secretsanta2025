const Config = require('./gameConfig');

// FIXED: Use 'const' so the reference never breaks
const players = {}; 

// FIXED: Move primitives into an object so they are passed by reference
const state = {
    partyMultiplier: 1,
    sacrificeCost: Config.COSTS.SACRIFICE_START,
    isGameUnlocked: false,
    isExpeditionStarted: false,
    isGameOver: false
};

function getPlayer(socketId, socketIdMap) {
    const playerId = socketIdMap[socketId];
    return players[playerId];
}

function initPlayer(id, name) {
    if (!players[id]) {
        players[id] = {
            name: name.substring(0, 15),
            score: 0,
            totalEarnedMass: 0,
            // Inventory
            helpers: 0, tnt: 0, drills: 0, excavators: 0,
            // Stats
            clickPower: 1, critChance: 0, synergyLevel: 0,
            // Costs
            nextHelperCost: Config.COSTS.HELPER,
            nextTntCost: Config.COSTS.TNT,
            nextHammerCost: Config.COSTS.HAMMER,
            nextDrillCost: Config.COSTS.DRILL,
            nextExcavatorCost: Config.COSTS.EXCAVATOR,
            nextPowerClickCost: Config.COSTS.POWER_CLICK,
            nextCritCost: Config.COSTS.CRIT,
            nextSynergyCost: Config.COSTS.SYNERGY,
            // Tracking
            totalHelpers: 0, totalTnt: 0, totalDrills: 0,
            totalExcavators: 0, totalClickUpgrades: 0, totalHammerUpgrades: 0,
            totalClicks: 0, sacrifices: 0, attackCost: 0,
            foundSecret: false, history: {}
        };
    } else {
        players[id].name = name.substring(0, 15);
    }
}

function resetGame() {
    // Delete keys to preserve object reference
    for (const key in players) {
        delete players[key];
    }
    
    state.partyMultiplier = 1;
    state.sacrificeCost = Config.COSTS.SACRIFICE_START;
    state.isGameUnlocked = false;
    state.isExpeditionStarted = false;
    state.isGameOver = false;
    Config.THRESHOLDS.forEach(t => t.revealed = false);
}

module.exports = {
    players,
    state, // Export the state object directly
    getPlayer,
    initPlayer,
    resetGame
};