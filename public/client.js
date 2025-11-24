const socket = io();

const sounds = {
    click: document.getElementById('click-sound'),
    buy: document.getElementById('purchase-sound'),
    prank: document.getElementById('prank-sound'),
    secret: document.getElementById('secret-sound'),
    sacrifice: document.getElementById('sacrifice-sound'),
    crack: document.getElementById('crack-sound'),
    whoosh: document.getElementById('whoosh-sound'),
    meow: document.getElementById('meow-sound')
};

let lastClickSoundTime = 0;
let canClick = true;

function unlockAudio() {
    for (let key in sounds) {
        if(sounds[key]) {
            sounds[key].volume = 0; 
            sounds[key].play().then(() => {
                sounds[key].pause();
                sounds[key].currentTime = 0;
                sounds[key].volume = 1; 
            }).catch(e => console.log("Audio warm-up skipped", e));
        }
    }
}

const elements = {
    loginContainer: document.getElementById('login-container'),
    gameWrapper: document.getElementById('game-wrapper'),
    mainContent: document.querySelector('.main-content'),
    shakeWrapper: document.getElementById('shake-wrapper'),
    totalMassDisplay: document.getElementById('total-mass-display'),
    headerMultiplier: document.getElementById('header-multiplier'),
    myScoreDisplay: document.getElementById('my-score-display'),
    upgradesMassDisplay: document.getElementById('upgrades-mass-display'),
    passiveRateDisplay: document.getElementById('passive-rate-display'),
    
    clickerButton: document.getElementById('clicker-button'),
    leaderboard: document.getElementById('leaderboard'),
    nameInput: document.getElementById('name-input'),
    joinButton: document.getElementById('join-button'),
    
    // BUTTONS
    purchaseHelperButton: document.getElementById('purchase-helper-button'),
    purchaseTntButton: document.getElementById('purchase-tnt-button'),
    purchaseDrillButton: document.getElementById('purchase-drill-button'),
    purchaseExcavatorButton: document.getElementById('purchase-excavator-button'),
    purchasePowerClickButton: document.getElementById('purchase-power-click-button'),
    purchaseHammerButton: document.getElementById('purchase-hammer-button'),
    purchaseCritButton: document.getElementById('purchase-crit-button'),
    purchaseSynergyButton: document.getElementById('purchase-synergy-button'),
    sacrificeButton: document.getElementById('sacrifice-button'),
    
    // COSTS
    helperCostDisplay: document.getElementById('helper-cost-display'),
    tntCostDisplay: document.getElementById('tnt-cost-display'),
    drillCostDisplay: document.getElementById('drill-cost-display'),
    excavatorCostDisplay: document.getElementById('excavator-cost-display'),
    powerClickCostDisplay: document.getElementById('power-click-cost-display'),
    hammerCostDisplay: document.getElementById('hammer-cost-display'),
    critCostDisplay: document.getElementById('crit-cost-display'),
    synergyCostDisplay: document.getElementById('synergy-cost-display'),
    sacrificeCostDisplay: document.getElementById('sacrifice-cost-display'),
    
    // TITLES
    helperTitle: document.getElementById('helper-title'),
    tntTitle: document.getElementById('tnt-title'),
    drillTitle: document.getElementById('drill-title'),
    excavatorTitle: document.getElementById('excavator-title'),
    clickTitle: document.getElementById('click-title'),
    hammerTitle: document.getElementById('hammer-title'),
    critTitle: document.getElementById('crit-title'),
    synergyTitle: document.getElementById('synergy-title'),
    
    announcementBar: document.getElementById('announcement-bar'),
    codeBoxes: document.querySelectorAll('.code-box'),
    codeGoals: document.querySelectorAll('.code-goal'), 
    
    // STATS Game Tab (WRAPPERS)
    statGeologist: document.getElementById('stat-geologist'),
    statTnt: document.getElementById('stat-tnt'),
    statDrill: document.getElementById('stat-drill'),
    statExcavator: document.getElementById('stat-excavator'),
    statCrit: document.getElementById('stat-crit'),
    statSynergy: document.getElementById('stat-synergy'),
    
    // STAT VALUES
    myHelpersDisplay: document.getElementById('my-helpers-display'),
    myTntDisplay: document.getElementById('my-tnt-display'),
    myDrillsDisplay: document.getElementById('my-drills-display'),
    myExcavatorsDisplay: document.getElementById('my-excavators-display'),
    myClickPowerDisplay: document.getElementById('my-click-power-display'),
    myCritDisplay: document.getElementById('my-crit-display'),
    mySynergyDisplay: document.getElementById('my-synergy-display'),
    
    hiddenCat: document.getElementById('hidden-cat'),
    tabNav: document.querySelector('.tab-nav'),
    pages: document.querySelectorAll('.page'),
    
    tutorialOverlay: document.getElementById('tutorial-overlay'),
    inviteOverlay: document.getElementById('invite-overlay'),
    waitingOverlay: document.getElementById('waiting-overlay'),
    startPartyButton: document.getElementById('start-party-button'),
    letsDigButton: document.getElementById('lets-dig-button'),
    gameTitle: document.getElementById('game-title'),
    rockText: document.getElementById('rock-text'),
    lockedFeatures: document.querySelectorAll('.locked-feature'),
    lobbyList: document.getElementById('lobby-list'),
    lobbyCount: document.getElementById('lobby-count'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    progressText: document.getElementById('progress-text'),
    earthquakeOverlay: document.getElementById('earthquake-overlay'),
    earthquakeUser: document.getElementById('earthquake-user'),
    earthquakeMultiplier: document.getElementById('earthquake-multiplier'),
    earthquakeCloseBtn: document.getElementById('earthquake-close-btn'),
    summaryOverlay: document.getElementById('summary-overlay'),
    summaryContent: document.getElementById('summary-content'),
    finalCodeDisplay: document.getElementById('final-code-display'),
    
    // CONFIRMATION & DISCONNECT REFS
    confirmStartOverlay: document.getElementById('confirm-start-overlay'),
    confirmStartBtn: document.getElementById('confirm-start-btn'),
    cancelStartBtn: document.getElementById('cancel-start-btn'),
    disconnectOverlay: document.getElementById('disconnect-overlay'),
    
    // BUTTON REFS (For convenience)
    btnHelper: document.getElementById('purchase-helper-button'),
    btnTnt: document.getElementById('purchase-tnt-button'),
    btnDrill: document.getElementById('purchase-drill-button'),
    btnExcavator: document.getElementById('purchase-excavator-button'),
    btnClick: document.getElementById('purchase-power-click-button'),
    btnHammer: document.getElementById('purchase-hammer-button'),
    btnCrit: document.getElementById('purchase-crit-button'),
    btnSynergy: document.getElementById('purchase-synergy-button'),
    btnSacrifice: document.getElementById('sacrifice-button'),
    
    helpBtn: document.getElementById('help-btn'),
    helpOverlay: document.getElementById('help-overlay'),
    helpCloseBtn: document.getElementById('help-close-btn')
};

let isGremlined = false;
let tutorialClicks = 0;
let gameIsUnlocked = false;
let hasJoined = false;
let isHost = false;
let totalPlayers = 1;
let myClickPower = 1; 
let myMulti = 1; 
let myCritChance = 0;
let mySynergy = 0;
let myPassiveIncome = 0;
let myCurrentScore = 0; 

// Helper to format Big Numbers (1k, 1M, 1B)
function formatMass(num) {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

function getPlayerId() {
    let playerId = localStorage.getItem('partyClickerPlayerId');
    if (!playerId) {
        playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('partyClickerPlayerId', playerId);
    }
    return playerId;
}

function unlockFullGame() {
    gameIsUnlocked = true;
    elements.lockedFeatures.forEach(el => el.classList.remove('locked-feature'));
    elements.rockText.textContent = "MINE ROCK!";
}

function updateStartButton() {
    // REQUIRE 2 PLAYERS
    if (totalPlayers >= 2) {
        elements.letsDigButton.disabled = false;
        elements.letsDigButton.innerHTML = `LAUNCH EXPEDITION! 🚀<br><span style="font-size:12px">(All ${totalPlayers} Geologists Ready)</span>`;
        elements.letsDigButton.style.backgroundColor = "#4CAF50"; 
        elements.letsDigButton.style.cursor = "pointer";
    } else {
        elements.letsDigButton.disabled = true;
        const needed = 2 - totalPlayers;
        elements.letsDigButton.textContent = `Waiting for teammates... (${totalPlayers}/2)`;
        elements.letsDigButton.style.backgroundColor = "#A1887F";
        elements.letsDigButton.style.cursor = "not-allowed";
    }
}

function createParticle(x, y, value, isCrit) {
    const particle = document.createElement('div');
    particle.className = 'floating-number';
    if (isCrit) particle.classList.add('crit');
    particle.textContent = (isCrit ? 'CRIT! ' : '+') + Math.floor(value).toLocaleString();
    particle.style.left = `${x}px`;
    particle.style.top = `${y - 80}px`; 
    document.body.appendChild(particle);
    setTimeout(() => { particle.remove(); }, 1000);
}

function checkAffordability(cost, buttonElement) {
    if (myCurrentScore < cost) {
        buttonElement.disabled = true;
        buttonElement.style.opacity = '0.5';
        buttonElement.style.filter = 'grayscale(100%)';
    } else {
        buttonElement.disabled = false;
        buttonElement.style.opacity = '1';
        buttonElement.style.filter = 'none';
    }
}

const updateBtnTitle = (el, title, count) => {
    el.textContent = count > 0 ? `${title} (Owned: ${count})` : title;
};

// --- LISTENERS ---

socket.on('disconnect', () => {
    elements.disconnectOverlay.style.display = 'flex';
});
socket.on('connect_error', () => {
    elements.disconnectOverlay.style.display = 'flex';
});

socket.on('forceRefresh', () => { window.location.reload(); });
window.resetGameNow = function() { if(confirm("⚠️ ARE YOU SURE? This will wipe the server and kick everyone.")) { socket.emit('adminResetGame'); } }

elements.joinButton.addEventListener('click', () => {
    const playerName = elements.nameInput.value.trim();
    if (playerName) {
        unlockAudio();
        socket.emit('joinGame', { name: playerName, id: getPlayerId() });
        hasJoined = true; 
        elements.loginContainer.style.display = 'none';
        elements.gameWrapper.style.display = 'flex';
    }
});

elements.clickerButton.addEventListener('click', (e) => {
    socket.emit('playerClick');
    if (isGremlined) jumpButton();
    
    const now = Date.now();
    if (now - lastClickSoundTime > 2000) {
            if (sounds.click) {
                const clickClone = sounds.click.cloneNode();
                clickClone.play().catch(() => {});
            }
            lastClickSoundTime = now;
    }

    let x = e.clientX;
    let y = e.clientY;
    if (!x) {
        const rect = elements.clickerButton.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }
    
    const synergyBonus = myPassiveIncome * (mySynergy * 0.02);
    let val = (myClickPower + synergyBonus) * myMulti;
    
    let isCrit = false;
    if (Math.random() * 100 < myCritChance) {
        val *= 10; 
        isCrit = true;
    }
    
    createParticle(x, y, val, isCrit);

    if (!gameIsUnlocked) {
        tutorialClicks++;
        if (tutorialClicks >= 10) {
            elements.tutorialOverlay.style.display = 'flex';
        }
    }
});

elements.startPartyButton.addEventListener('click', () => {
    socket.emit('unlockGame');
    isHost = true; 
    elements.tutorialOverlay.style.display = 'none';
    updateStartButton();
});

// CONFIRMATION DIALOG
elements.letsDigButton.addEventListener('click', () => {
    elements.confirmStartOverlay.style.display = 'flex';
});

elements.confirmStartBtn.addEventListener('click', () => {
    socket.emit('startExpedition');
    elements.confirmStartOverlay.style.display = 'none';
    elements.inviteOverlay.style.display = 'none';
});

elements.cancelStartBtn.addEventListener('click', () => {
    elements.confirmStartOverlay.style.display = 'none';
});

elements.earthquakeCloseBtn.addEventListener('click', () => {
    elements.earthquakeOverlay.style.display = 'none';
});

elements.helpBtn.addEventListener('click', () => {
    elements.helpOverlay.style.display = 'flex';
});
elements.helpCloseBtn.addEventListener('click', () => {
    elements.helpOverlay.style.display = 'none';
});

elements.tabNav.addEventListener('click', (event) => { const button = event.target.closest('.tab-button'); if (button) { const pageId = button.dataset.page; elements.pages.forEach(page => page.classList.toggle('active', page.id === pageId)); elements.tabNav.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageId)); } });

elements.purchaseHelperButton.addEventListener('click', () => { socket.emit('purchaseHelper'); if(sounds.buy) sounds.buy.play(); });
elements.purchaseTntButton.addEventListener('click', () => { socket.emit('purchaseTnt'); if(sounds.buy) sounds.buy.play(); });
elements.purchaseDrillButton.addEventListener('click', () => { socket.emit('purchaseDrill'); if(sounds.buy) sounds.buy.play(); });
elements.purchaseExcavatorButton.addEventListener('click', () => { socket.emit('purchaseExcavator'); if(sounds.buy) sounds.buy.play(); });
elements.purchasePowerClickButton.addEventListener('click', () => { socket.emit('purchasePowerClick'); if(sounds.buy) sounds.buy.play(); });
elements.purchaseHammerButton.addEventListener('click', () => { socket.emit('purchaseHammer'); if(sounds.buy) sounds.buy.play(); });
elements.purchaseCritButton.addEventListener('click', () => { socket.emit('purchaseCrit'); if(sounds.buy) sounds.buy.play(); });
elements.purchaseSynergyButton.addEventListener('click', () => { socket.emit('purchaseSynergy'); if(sounds.buy) sounds.buy.play(); });
elements.sacrificeButton.addEventListener('click', () => socket.emit('sacrificeForParty')); 

elements.hiddenCat.addEventListener('click', () => { socket.emit('foundHiddenCat'); elements.hiddenCat.style.display = 'none'; });

elements.leaderboard.addEventListener('click', (event) => { 
    if (event.target.classList.contains('my-entry-name')) {
        socket.emit('foundHiddenCat');
        event.target.style.color = '#3E2723';
        event.target.style.cursor = 'default';
        event.target.style.textDecoration = 'none';
    }

    if (event.target.classList.contains('action-button')) { 
        const targetPlayerId = event.target.dataset.playerId; 
        let cost = 0;
        if (event.target.classList.contains('crack-button')) cost = 100;
        else if (event.target.classList.contains('cat-button')) cost = 250;
        else if (event.target.classList.contains('flip-button')) cost = 500;
        else if (event.target.classList.contains('gremlin-button')) cost = 750;

        if (myCurrentScore >= cost) {
            if (event.target.classList.contains('poke-button')) socket.emit('crackPlayer', targetPlayerId); 
            else if (event.target.classList.contains('flip-button')) socket.emit('flipPlayer', targetPlayerId); 
            else if (event.target.classList.contains('gremlin-button')) socket.emit('gremlinPlayer', targetPlayerId);
            else if (event.target.classList.contains('cat-button')) socket.emit('sendCat', targetPlayerId);
            if(sounds.buy) sounds.buy.play(); 
        }
    } 
});

// --- SOCKET EVENTS ---

socket.on('gameStateUpdate', (state) => {
    if (state.isGameUnlocked && !state.isExpeditionStarted) {
        if (hasJoined) {
            if (isHost) {
                elements.inviteOverlay.style.display = 'flex';
                elements.waitingOverlay.style.display = 'none';
            } else {
                elements.inviteOverlay.style.display = 'none';
                elements.waitingOverlay.style.display = 'flex';
            }
            unlockFullGame();
        }
    }
    
    if (state.isExpeditionStarted) {
        elements.inviteOverlay.style.display = 'none';
        elements.waitingOverlay.style.display = 'none';
        unlockFullGame();
    }

    const { players, partyMultiplier, sacrificeCost, nextGoal, thresholds } = state;
    
    myMulti = partyMultiplier;

    const totalScore = Object.values(players).reduce((sum, player) => sum + player.score, 0);
    let percentage = 0;
    if (nextGoal > 0) percentage = Math.min(100, (totalScore / nextGoal) * 100);
    else percentage = 100;
    
    elements.progressBarFill.style.width = `${percentage}%`;
    elements.progressText.textContent = `${formatMass(totalScore)} / ${formatMass(nextGoal)} (${Math.floor(percentage)}%)`;
    
    if (thresholds && thresholds.length) {
        thresholds.forEach(t => {
            if (elements.codeGoals[t.position]) {
                elements.codeGoals[t.position].textContent = formatMass(t.score);
                if (t.revealed) {
                    elements.codeGoals[t.position].style.opacity = '0.3';
                    elements.codeGoals[t.position].textContent = "✓";
                }
            }
        });
    }

    const btn = elements.clickerButton;
    btn.className = ''; 
    if (percentage > 33) btn.classList.add('stage-2');
    if (percentage > 66) btn.classList.add('stage-3');
    if (percentage > 90) btn.classList.add('stage-4');

    if (isHost && elements.inviteOverlay.style.display === 'flex') {
        elements.lobbyList.innerHTML = '';
        const playerNames = Object.values(players).map(p => p.name);
        totalPlayers = playerNames.length;
        elements.lobbyCount.textContent = totalPlayers;
        updateStartButton();
        playerNames.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            elements.lobbyList.appendChild(li);
        });
    }

    elements.leaderboard.innerHTML = '';
    const playerArray = Object.values(players);
    playerArray.sort((a, b) => b.score - a.score);
    
    elements.totalMassDisplay.textContent = Math.floor(totalScore).toLocaleString();
    elements.headerMultiplier.textContent = `${partyMultiplier}x`;
    elements.sacrificeCostDisplay.textContent = sacrificeCost.toLocaleString();
    
    const myId = getPlayerId();
    
    playerArray.forEach(player => {
        const entry = document.createElement('div');
        entry.classList.add('leaderboard-entry');
        const playerEntryId = Object.keys(players).find(id => players[id] === player);
        let actionsHTML = '';
        if (playerEntryId !== myId) {
            actionsHTML = `
                <div class="leaderboard-actions">
                    <button class="action-button poke-button crack-button" data-player-id="${playerEntryId}">Crack (100)</button>
                    <button class="action-button cat-button" data-player-id="${playerEntryId}">Cat (250)</button>
                    <button class="action-button flip-button" data-player-id="${playerEntryId}">Flip (500)</button>
                    <button class="action-button gremlin-button" data-player-id="${playerEntryId}">Fissure (750)</button>
                </div>
            `;
        }
        
        let nameHTML = `<span>${player.name}</span>`;
        if (playerEntryId === myId && !player.foundSecret) { 
            nameHTML = `<span class="my-entry-name" title="Is there a secret here?">${player.name}</span>`;
        }

        entry.innerHTML = `
            <div class="leaderboard-info">${nameHTML} <span>${Math.floor(player.score).toLocaleString()}</span></div>
            ${actionsHTML}
        `;
        elements.leaderboard.appendChild(entry);
    });

    const myServerState = players[myId];
    if (myServerState) {
        myCurrentScore = myServerState.score; 
        myClickPower = myServerState.clickPower;
        myCritChance = myServerState.critChance || 0;
        mySynergy = myServerState.synergyLevel || 0;
        myPassiveIncome = (myServerState.helpers * 1) + ((myServerState.tnt || 0) * 10) + ((myServerState.drills || 0) * 50) + ((myServerState.excavators || 0) * 500);
        
        const lifetime = myServerState.totalEarnedMass || 0;
        
        const updateVisibilityAndStats = (cost, btn, countDisplay, statEl, count) => {
            if (lifetime < cost * 0.66) btn.classList.add('hidden-upgrade'); 
            else btn.classList.remove('hidden-upgrade');
            checkAffordability(cost, btn); 
            if(statEl) statEl.style.display = (count || 0) > 0 ? 'inline' : 'none';
        };

        updateVisibilityAndStats(myServerState.nextHelperCost, elements.btnHelper, null, elements.statGeologist, myServerState.helpers);
        updateBtnTitle(elements.helperTitle, "Geologist", myServerState.helpers);
        
        updateVisibilityAndStats(myServerState.nextTntCost, elements.btnTnt, null, elements.statTnt, myServerState.tnt);
        updateBtnTitle(elements.tntTitle, "TNT Charge", myServerState.tnt || 0);

        updateVisibilityAndStats(myServerState.nextDrillCost, elements.btnDrill, null, elements.statDrill, myServerState.drills);
        updateBtnTitle(elements.drillTitle, "Ind. Drill", myServerState.drills || 0);

        updateVisibilityAndStats(myServerState.nextExcavatorCost, elements.btnExcavator, null, elements.statExcavator, myServerState.excavators);
        updateBtnTitle(elements.excavatorTitle, "Excavator", myServerState.excavators || 0);

        updateVisibilityAndStats(myServerState.nextCritCost, elements.btnCrit, null, elements.statCrit, myServerState.critChance);
        updateBtnTitle(elements.critTitle, "Lucky Geode", myServerState.critChance || 0);

        updateVisibilityAndStats(myServerState.nextSynergyCost, elements.btnSynergy, null, elements.statSynergy, myServerState.synergyLevel);
        updateBtnTitle(elements.synergyTitle, "Middle Manager", myServerState.synergyLevel || 0);
        
        checkAffordability(myServerState.nextPowerClickCost, elements.btnClick);
        updateBtnTitle(elements.clickTitle, "Pickaxe", myServerState.clickPower);
        
        if (lifetime < 300) elements.btnHammer.classList.add('hidden-upgrade'); 
        else elements.btnHammer.classList.remove('hidden-upgrade');
        checkAffordability(myServerState.nextHammerCost || 500, elements.btnHammer);
        elements.hammerCostDisplay.textContent = (myServerState.nextHammerCost || 500).toLocaleString();
        updateBtnTitle(elements.hammerTitle, "Pneumatic", myServerState.totalHammerUpgrades || 0);
        
        if (lifetime < 7500 * 0.66) elements.sacrificeButton.classList.add('hidden-upgrade'); 
        else elements.sacrificeButton.classList.remove('hidden-upgrade');
        checkAffordability(sacrificeCost, elements.sacrificeButton);
        
        const prankButtons = document.querySelectorAll('.leaderboard-actions .action-button');
        prankButtons.forEach(btn => {
            let cost = 100;
            if (btn.classList.contains('cat-button')) cost = 250;
            else if (btn.classList.contains('flip-button')) cost = 500;
            else if (btn.classList.contains('gremlin-button')) cost = 750;
            checkAffordability(cost, btn);
        });

        const myScoreText = `My Mass: ${Math.floor(myServerState.score).toLocaleString()}`;
        elements.myScoreDisplay.textContent = myScoreText;
        elements.upgradesMassDisplay.textContent = Math.floor(myServerState.score).toLocaleString();
        elements.passiveRateDisplay.textContent = `(+${Math.floor(myPassiveIncome * myMulti).toLocaleString()}/sec)`;
        
        elements.myHelpersDisplay.textContent = myServerState.helpers;
        elements.myTntDisplay.textContent = myServerState.tnt || 0;
        elements.myDrillsDisplay.textContent = myServerState.drills || 0;
        elements.myExcavatorsDisplay.textContent = myServerState.excavators || 0;
        elements.myClickPowerDisplay.textContent = myServerState.clickPower;
        elements.myCritDisplay.textContent = `${myServerState.critChance || 0}%`;
        elements.mySynergyDisplay.textContent = `${(myServerState.synergyLevel || 0) * 2}%`; 

        elements.helperCostDisplay.textContent = myServerState.nextHelperCost.toLocaleString();
        elements.tntCostDisplay.textContent = (myServerState.nextTntCost || 250).toLocaleString();
        elements.drillCostDisplay.textContent = (myServerState.nextDrillCost || 1000).toLocaleString();
        elements.excavatorCostDisplay.textContent = (myServerState.nextExcavatorCost || 15000).toLocaleString();
        elements.powerClickCostDisplay.textContent = myServerState.nextPowerClickCost.toLocaleString();
        elements.critCostDisplay.textContent = (myServerState.nextCritCost || 500).toLocaleString();
        elements.synergyCostDisplay.textContent = (myServerState.nextSynergyCost || 10000).toLocaleString();
    }
});

socket.on('gameUnlocked', () => {
    if (elements.tutorialOverlay.style.display === 'flex' || tutorialClicks >= 10) {
            isHost = true; 
            elements.inviteOverlay.style.display = 'flex';
            updateStartButton();
    }
    unlockFullGame();
});

socket.on('earthquakeTriggered', (data) => {
    elements.earthquakeUser.textContent = data.name;
    elements.earthquakeMultiplier.textContent = `${data.multiplier}x`;
    elements.earthquakeOverlay.style.display = 'flex';
    if(sounds.sacrifice) {
        sounds.sacrifice.play();
        if(window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate([200, 100, 200, 100, 500]);
        }
    }
});

socket.on('gameOver', (data) => {
    const players = data.players;
    const fullCode = data.fullCode;
    
    elements.summaryOverlay.style.display = 'flex';
    elements.finalCodeDisplay.textContent = fullCode; 
    elements.summaryContent.innerHTML = '';
    
    const playerArray = Object.values(players);
    
    // AWARDS CALCULATIONS
    const maxMass = Math.max(...playerArray.map(p => p.totalEarnedMass));
    const minMass = Math.min(...playerArray.map(p => p.totalEarnedMass));
    const maxQuakes = Math.max(...playerArray.map(p => p.sacrifices));
    const maxAttack = Math.max(...playerArray.map(p => p.attackCost || 0));
    const minAttack = Math.min(...playerArray.map(p => p.attackCost || 0));
    const maxClicks = Math.max(...playerArray.map(p => p.totalClicks || 0));
    const minClicks = Math.min(...playerArray.map(p => p.totalClicks || 0));
    const maxSynergy = Math.max(...playerArray.map(p => p.synergyLevel || 0));
    const maxCats = Math.max(...playerArray.map(p => {
        let cats = 0;
        if(p.history) { for (let k in p.history) cats += p.history[k].cats; }
        return cats;
    }));
    
    const getPassiveCount = (p) => (p.totalHelpers || 0) + (p.totalTnt || 0) + (p.totalDrills || 0) + (p.totalExcavators || 0);
    const maxPassive = Math.max(...playerArray.map(p => getPassiveCount(p)));

    playerArray.sort((a, b) => b.totalEarnedMass - a.totalEarnedMass);
    
    playerArray.forEach(player => {
        const card = document.createElement('div');
        card.className = 'summary-card';
        let badges = '';
        
        if (player.totalEarnedMass === maxMass) badges += ' 🏆 MVP';
        else if (player.totalEarnedMass === minMass) badges += ' 🦠 The Leech';
        
        if (player.sacrifices > 0 && player.sacrifices === maxQuakes) badges += ' 🌋 Hero';
        
        if ((player.attackCost || 0) === maxAttack && maxAttack > 0) badges += ' 😈 The Menace';
        if ((player.attackCost || 0) === 0) badges += ' 😇 The Saint';
        
        if ((player.totalClicks || 0) === maxClicks) badges += ' 👆 Finger Blaster';
        if ((player.totalClicks || 0) === minClicks && player.totalClicks > 0) badges += ' 😴 Sleeping Beauty';
        
        if (player.synergyLevel === maxSynergy && maxSynergy > 0) badges += ' 📈 Middle Manager';
        if (getPassiveCount(player) === maxPassive && maxPassive > 0) badges += ' 🏗️ The Investor';
        
        let playerCats = 0;
        if(player.history) { for (let k in player.history) playerCats += player.history[k].cats; }
        if (playerCats === maxCats && maxCats > 0) badges += ' 🐈 Cat Lady';

        let naughtylistHTML = '';
        if (player.history && Object.keys(player.history).length > 0) {
            naughtylistHTML = `<div class="naughty-list"><h4>😈 Attacks Sent By ${player.name}:</h4>`;
            for (const [targetName, stats] of Object.entries(player.history)) {
                let actions = [];
                if (stats.cracks > 0) actions.push(`${stats.cracks} Cracks`);
                if (stats.cats > 0) actions.push(`${stats.cats} Cats`);
                if (stats.flips > 0) actions.push(`${stats.flips} Flips`);
                if (stats.gremlins > 0) actions.push(`${stats.gremlins} Fissures`);
                if (actions.length > 0) {
                    naughtylistHTML += `<div class="naughty-item"><strong>Target: ${targetName}</strong> → ${actions.join(', ')}</div>`;
                }
            }
            naughtylistHTML += `</div>`;
        } else {
            naughtylistHTML = `<div class="naughty-list"><h4>😈 Attacks Sent:</h4><div class="naughty-item" style="color: green;">😇 A perfect angel! (No attacks sent)</div></div>`;
        }
        card.innerHTML = `
            <h3>${player.name} <span style="font-size:12px">${badges}</span></h3>
            <div class="summary-stat"><span>Final Mass Score:</span> <strong>${Math.floor(player.totalEarnedMass).toLocaleString()}</strong></div>
            <div class="summary-stat"><span>Total Manual Clicks:</span> <strong>${player.totalClicks || 0}</strong></div>
            <div class="summary-stat" style="margin-top: 10px; border-top: 1px dashed #A1887F; padding-top: 5px;"><strong>Lifetime Upgrades:</strong></div>
            <div class="summary-stat"><span>Geologists:</span> <strong>${player.totalHelpers || 0}</strong></div>
            <div class="summary-stat"><span>TNT:</span> <strong>${player.totalTnt || 0}</strong></div>
            <div class="summary-stat"><span>Drills:</span> <strong>${player.totalDrills || 0}</strong></div>
            <div class="summary-stat"><span>Excavators:</span> <strong>${player.totalExcavators || 0}</strong></div>
            <div class="summary-stat"><span>Pickaxe Upgrades:</span> <strong>${player.totalClickUpgrades || 0}</strong></div>
            
            <div class="summary-stat" style="border-top: 1px solid #ccc; margin-top: 5px; padding-top: 5px;"><span>Earthquakes:</span> <strong>${player.sacrifices || 0}</strong></div>
            <div class="summary-stat" style="color:#D32F2F;">
                <span>Total Mass Wasted on Pranks:</span> <strong>${(player.attackCost || 0).toLocaleString()}</strong>
            </div>
            ${naughtylistHTML}
        `;
        elements.summaryContent.appendChild(card);
    });
});

socket.on('unlockCodePiece', (data) => { if (elements.codeBoxes[data.position]) { elements.codeBoxes[data.position].textContent = data.code; } if(sounds.secret) sounds.secret.play(); });

socket.on('announcement', (data) => {
    const messageElement = document.createElement('p');
    messageElement.className = 'announcement-message';
    messageElement.textContent = data.text;
    
    const txt = data.text.toLowerCase();
    if (txt.includes('sacrificed') || txt.includes('earthquake') || txt.includes('excavation') || txt.includes('fossil')) {
        messageElement.classList.add('msg-high-priority');
    } else if (txt.includes('smashed') || txt.includes('shifted') || txt.includes('fissure')) {
        messageElement.classList.add('msg-attack');
    } else if (txt.includes('mole') || txt.includes('cat')) {
        messageElement.classList.add('msg-fun');
    } else {
        messageElement.classList.add('msg-system');
    }

    elements.announcementBar.prepend(messageElement);
    if (elements.announcementBar.childElementCount > 8) {
        elements.announcementBar.lastChild.remove();
    }
});

socket.on('youGotCracked', () => {
    const crackImg = document.createElement('img');
    crackImg.src = 'crack.png';
    crackImg.className = 'screen-crack';
    const x = Math.random() * (window.innerWidth - 200);
    const y = Math.random() * (window.innerHeight - 200);
    crackImg.style.left = x + 'px';
    crackImg.style.top = y + 'px';
    crackImg.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(crackImg);
    if(sounds.crack) sounds.crack.play();
    setTimeout(() => { crackImg.remove(); }, 15000);
});
socket.on('youGotFlipped', () => { elements.mainContent.classList.add('flip-effect'); setTimeout(() => { elements.mainContent.classList.remove('flip-effect'); }, 15000); if(sounds.whoosh) sounds.whoosh.play(); });
socket.on('youGotGremlined', () => { isGremlined = true; elements.clickerButton.style.boxShadow = '0 0 25px 10px #9C27B0'; setTimeout(() => { isGremlined = false; elements.clickerButton.style.top = '0px'; elements.clickerButton.style.left = '0px'; elements.clickerButton.style.boxShadow = 'inset -10px -10px 20px rgba(0,0,0,0.4), inset 10px 10px 20px rgba(255,255,255,0.2), 0 8px 5px rgba(0,0,0,0.3)'; }, 30000); if(sounds.prank) sounds.prank.play(); });
socket.on('catAttack', () => {
    const cats = ['🐈', '😻', '🙀'];
    const randomCat = cats[Math.floor(Math.random() * cats.length)];
    const catElement = document.createElement('div');
    catElement.className = 'cat-container';
    catElement.textContent = randomCat;
    document.body.appendChild(catElement);
    if(sounds.meow) sounds.meow.play();
    setTimeout(() => { catElement.remove(); }, 12500);
});

function jumpButton() { 
    const container = elements.shakeWrapper; 
    const button = elements.clickerButton; 
    const containerWidth = container.offsetWidth; 
    const buttonWidth = button.offsetWidth; 
    const containerHeight = container.offsetHeight; 
    const buttonHeight = button.offsetHeight; 
    
    const padding = 40;
    const maxX = (containerWidth - buttonWidth) / 2 - padding; 
    const maxY = (containerHeight - buttonHeight) / 2 - padding; 
    
    const safeMaxX = Math.max(0, maxX);
    const safeMaxY = Math.max(0, maxY);

    const randomLeftOffset = (Math.random() * 2 - 1) * safeMaxX; 
    const randomTopOffset = (Math.random() * 2 - 1) * safeMaxY; 
    
    button.style.left = `${randomLeftOffset}px`; 
    button.style.top = `${randomTopOffset}px`; 
}