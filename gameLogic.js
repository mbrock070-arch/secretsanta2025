// gameLogic.js
const Config = require('./gameConfig');

let players = {};
let partyMultiplier = 1;
let sacrificeCost = Config.COSTS.SACRIFICE_START;
let isGameUnlocked = false;
let isExpeditionStarted = false;
let isGameOver = false;

// Helper to get player by socket ID
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
    players = {};
    partyMultiplier = 1;
    sacrificeCost = Config.COSTS.SACRIFICE_START;
    isGameUnlocked = false;
    isExpeditionStarted = false;
    isGameOver = false;
    Config.THRESHOLDS.forEach(t => t.revealed = false);
}

// Export the state and functions
module.exports = {
    players,
    partyMultiplier,
    sacrificeCost,
    isGameUnlocked,
    isExpeditionStarted,
    isGameOver,
    getPlayer,
    initPlayer,
    resetGame,
    // Getters/Setters for primitives (since they are passed by value)
    getMultiplier: () => partyMultiplier,
    setMultiplier: (val) => partyMultiplier = val,
    addMultiplier: (val) => partyMultiplier += val,
    getSacrificeCost: () => sacrificeCost,
    multiplySacrificeCost: (val) => sacrificeCost *= val,
    setGameUnlocked: (val) => isGameUnlocked = val,
    setExpeditionStarted: (val) => isExpeditionStarted = val,
    setGameOver: (val) => isGameOver = val
};