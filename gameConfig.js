module.exports = {
    THRESHOLDS: [
        { score: 250000, code: 'U', position: 1, revealed: false },
        { score: 25000000, code: 'D', position: 3, revealed: false },
        { score: 2500000000, code: 'R', position: 2, revealed: false },
        { score: 250000000000, code: 'T', position: 0, revealed: false }
    ],
    COSTS: {
        HELPER: 15,
        TNT: 250,
        HAMMER: 500,
        DRILL: 1000,
        CRIT: 500,
        SYNERGY: 10000,
        EXCAVATOR: 15000,
        POWER_CLICK: 25,
        SACRIFICE_START: 7500
    },
    ATTACKS: {
        CRACK: 100,
        CAT: 250,
        FLIP: 500,
        GREMLIN: 750
    },
    CONSTANTS: {
        SYNERGY_PER_LEVEL: 0.02,
        HIDDEN_CAT_BASE: 50000,
        CRIT_CHANCE_CAP: 50
    }
};