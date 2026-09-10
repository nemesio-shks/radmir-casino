import { t, getLang, setLang, applyTranslations, currencySymbols } from './i18n.js';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Simple local "accounts" storage (no backend, per-browser) ----------
const USERS_KEY = 'casino_users_v1';
const SESSION_KEY = 'casino_session_v1';

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function defaultAccountState() {
  return {
    theme: 'dark',
    currency: 'USD',
    balance: 1000,
    history: []
  };
}

// simple non-cryptographic hash, sufficient for local demo auth
function hashPassword(pw) {
  let h = 0;
  for (let i = 0; i < pw.length; i++) {
    h = (Math.imul(31, h) + pw.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

let users = loadUsers();
let currentUsername = null;
let state = null;

function saveState() {
  if (!currentUsername) return;
  users[currentUsername].state = state;
  saveUsers(users);
}

// ---------- DOM refs ----------
const authCard = document.getElementById('authCard');
const appContent = document.getElementById('appContent');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authError = document.getElementById('authError');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authSwitchText = document.getElementById('authSwitchText');
const authSwitchLink = document.getElementById('authSwitchLink');
const authUsername = document.getElementById('authUsername');
const authPassword = document.getElementById('authPassword');
const userNameLabel = document.getElementById('userNameLabel');
const logoutBtn = document.getElementById('logoutBtn');
const settingsBtn = document.getElementById('settingsBtn');

const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const langSelect = document.getElementById('langSelect');
const themeSelect = document.getElementById('themeSelect');
const currencySelect = document.getElementById('currencySelect');
const resetBtn = document.getElementById('resetBtn');

const balanceLabel = document.getElementById('balanceLabel');
const currencySymbolLabel = document.getElementById('currencySymbolLabel');
const topUpBtn = document.getElementById('topUpBtn');

const gamesBar = document.getElementById('gamesBar');
const gameSections = {
  blackjack: document.getElementById('blackjackGame'),
  redblack: document.getElementById('redblackGame'),
  dice: document.getElementById('diceGame')
};

const historyBody = document.getElementById('historyBody');
const emptyMsg = document.getElementById('emptyMsg');
const totalSum = document.getElementById('totalSum');

let isRegisterMode = false;

// ---------- Localization ----------
langSelect.value = getLang();
applyTranslations();

langSelect.addEventListener('change', () => {
  setLang(langSelect.value);
  renderAll();
});

// ---------- Auth ----------
authSwitchLink.addEventListener('click', (e) => {
  e.preventDefault();
  isRegisterMode = !isRegisterMode;
  authTitle.textContent = isRegisterMode ? t('registerTitle') : t('loginTitle');
  authSubmitBtn.textContent = isRegisterMode ? t('registerBtn') : t('loginBtn');
  authSwitchText.textContent = isRegisterMode ? t('haveAccount') : t('noAccount');
  authSwitchLink.textContent = isRegisterMode ? t('loginLink') : t('registerLink');
  authError.textContent = '';
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  authError.textContent = '';
  const username = authUsername.value.trim();
  const password = authPassword.value;

  if (!username || !password) {
    authError.textContent = t('authError_empty');
    return;
  }
  if (password.length < 4) {
    authError.textContent = t('authError_short');
    return;
  }

  const key = username.toLowerCase();

  if (isRegisterMode) {
    if (users[key]) {
      authError.textContent = t('authError_taken');
      return;
    }
    users[key] = {
      displayName: username,
      passHash: hashPassword(password),
      state: defaultAccountState()
    };
    saveUsers(users);
    loginAs(key);
  } else {
    const account = users[key];
    if (!account) {
      authError.textContent = t('authError_notfound');
      return;
    }
    if (account.passHash !== hashPassword(password)) {
      authError.textContent = t('authError_wrongpass');
      return;
    }
    loginAs(key);
  }
});

function loginAs(key) {
  currentUsername = key;
  localStorage.setItem(SESSION_KEY, key);
  state = users[key].state || defaultAccountState();
  if (!state.theme) state.theme = 'dark';
  if (!state.currency) state.currency = 'USD';
  users[key].state = state;
  saveUsers(users);

  authCard.classList.add('hidden');
  appContent.classList.remove('hidden');
  settingsBtn.classList.remove('hidden');
  userNameLabel.textContent = users[key].displayName;
  authForm.reset();
  renderAll();
}

logoutBtn.addEventListener('click', () => {
  currentUsername = null;
  state = null;
  localStorage.removeItem(SESSION_KEY);
  authCard.classList.remove('hidden');
  appContent.classList.add('hidden');
  settingsBtn.classList.add('hidden');
});

function tryAutoLogin() {
  const savedKey = localStorage.getItem(SESSION_KEY);
  if (savedKey && users[savedKey]) {
    loginAs(savedKey);
  }
}

// ---------- Settings modal ----------
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.classList.add('hidden');
});

function applyTheme() {
  document.body.setAttribute('data-theme', state.theme || 'dark');
  themeSelect.value = state.theme || 'dark';
}

themeSelect.addEventListener('change', () => {
  state.theme = themeSelect.value;
  applyTheme();
  saveState();
});

currencySelect.addEventListener('change', () => {
  state.currency = currencySelect.value;
  renderBalance();
  saveState();
});

// ---------- Balance / top up / reset ----------
function renderBalance() {
  balanceLabel.textContent = formatMoney(state.balance);
  currencySymbolLabel.textContent = currencySymbols[state.currency] || state.currency;
  currencySelect.value = state.currency || 'USD';
}

function formatMoney(n) {
  return Math.round(n).toLocaleString('uk-UA');
}

topUpBtn.addEventListener('click', () => {
  const amountStr = prompt(t('topUpPrompt'), '1000');
  if (!amountStr) return;
  const amount = parseFloat(amountStr.replace(',', '.'));
  if (isNaN(amount) || amount <= 0) return;
  state.balance += amount;
  renderBalance();
  saveState();
});

resetBtn.addEventListener('click', () => {
  if (!confirm(t('resetConfirm'))) return;
  state.balance = 1000;
  state.history = [];
  saveState();
  renderAll();
  settingsModal.classList.add('hidden');
});

// ---------- Games tab switching ----------
gamesBar.addEventListener('click', (e) => {
  const tab = e.target.closest('.game-tab');
  if (!tab) return;
  const game = tab.getAttribute('data-game');
  document.querySelectorAll('.game-tab').forEach(el => el.classList.toggle('active', el === tab));
  Object.keys(gameSections).forEach(key => {
    gameSections[key].classList.toggle('hidden', key !== game);
  });
});

// ---------- History ----------
function addHistory(gameKey, gameLabel, bet, resultText, delta) {
  state.history.push({
    id: uid(),
    game: gameLabel,
    bet,
    resultText,
    delta,
    balanceAfter: state.balance,
    time: new Date().toLocaleString('uk-UA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
  });
  saveState();
  renderHistory();
}

function renderHistory() {
  historyBody.innerHTML = '';
  emptyMsg.style.display = state.history.length ? 'none' : 'block';

  [...state.history].reverse().slice(0, 200).forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.game)}</td>
      <td>${formatMoney(item.bet)}</td>
      <td class="${item.delta >= 0 ? 'profit-pos' : 'profit-neg'}">${escapeHtml(item.resultText)} (${item.delta >= 0 ? '+' : ''}${formatMoney(item.delta)})</td>
      <td>${formatMoney(item.balanceAfter)}</td>
      <td>${escapeHtml(item.time)}</td>
    `;
    historyBody.appendChild(tr);
  });

  const grandTotal = state.history.reduce((sum, h) => sum + h.delta, 0);
  totalSum.textContent = (grandTotal >= 0 ? '+' : '') + formatMoney(grandTotal);
  totalSum.style.color = grandTotal >= 0 ? 'var(--profit-pos)' : 'var(--profit-neg)';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// BLACKJACK
// ============================================================
const bjBetInput = document.getElementById('bjBetInput');
const bjChipRow = document.getElementById('bjChipRow');
const bjDealBtn = document.getElementById('bjDealBtn');
const bjHitBtn = document.getElementById('bjHitBtn');
const bjStandBtn = document.getElementById('bjStandBtn');
const bjDoubleBtn = document.getElementById('bjDoubleBtn');
const bjDealerCards = document.getElementById('bjDealerCards');
const bjPlayerCards = document.getElementById('bjPlayerCards');
const bjDealerScore = document.getElementById('bjDealerScore');
const bjPlayerScore = document.getElementById('bjPlayerScore');
const bjResult = document.getElementById('bjResult');

const SUITS = [
  { s: '♠', color: 'black' }, { s: '♥', color: 'red' },
  { s: '♦', color: 'red' }, { s: '♣', color: 'black' }
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let bjDeck = [];
let bjDealerHand = [];
let bjPlayerHand = [];
let bjBet = 0;
let bjRoundActive = false;

function freshDeck() {
  const deck = [];
  SUITS.forEach(suit => {
    RANKS.forEach(rank => {
      deck.push({ rank, suit: suit.s, color: suit.color });
    });
  });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(rank) {
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function handScore(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c.rank), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function renderCard(container, card, hidden) {
  const el = document.createElement('div');
  if (hidden) {
    el.className = 'playing-card back';
    el.textContent = '';
  } else {
    el.className = 'playing-card ' + card.color;
    el.innerHTML = `<span>${card.rank}</span><span>${card.suit}</span>`;
  }
  container.appendChild(el);
}

function renderBjTable(hideHoleCard) {
  bjDealerCards.innerHTML = '';
  bjPlayerCards.innerHTML = '';

  bjDealerHand.forEach((card, idx) => {
    renderCard(bjDealerCards, card, hideHoleCard && idx === 1);
  });
  bjPlayerHand.forEach(card => renderCard(bjPlayerCards, card, false));

  bjPlayerScore.textContent = handScore(bjPlayerHand);
  bjDealerScore.textContent = hideHoleCard ? '?' : handScore(bjDealerHand);
}

function chipRowHandler(row, input) {
  row.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const current = parseFloat(input.value) || 0;
      input.value = current + parseFloat(chip.getAttribute('data-amount'));
    });
  });
}
chipRowHandler(bjChipRow, bjBetInput);

function setBjControls(dealing, canAct) {
  bjDealBtn.disabled = dealing;
  bjBetInput.disabled = dealing;
  bjHitBtn.disabled = !canAct;
  bjStandBtn.disabled = !canAct;
  bjDoubleBtn.disabled = !canAct || bjPlayerHand.length !== 2 || bjBet * 2 > state.balance;
}

bjDealBtn.addEventListener('click', () => {
  const bet = parseFloat(bjBetInput.value);
  if (isNaN(bet) || bet <= 0) {
    bjResult.textContent = t('placeBetFirst');
    return;
  }
  if (bet > state.balance) {
    bjResult.textContent = t('notEnoughBalance');
    return;
  }

  bjBet = bet;
  state.balance -= bet;
  renderBalance();
  saveState();

  bjDeck = freshDeck();
  bjPlayerHand = [bjDeck.pop(), bjDeck.pop()];
  bjDealerHand = [bjDeck.pop(), bjDeck.pop()];
  bjResult.textContent = '';
  bjRoundActive = true;

  renderBjTable(true);
  setBjControls(true, true);

  const playerScore = handScore(bjPlayerHand);
  if (playerScore === 21) {
    finishBjRound();
  }
});

bjHitBtn.addEventListener('click', () => {
  if (!bjRoundActive) return;
  bjPlayerHand.push(bjDeck.pop());
  renderBjTable(true);
  const score = handScore(bjPlayerHand);
  if (score > 21) {
    finishBjRound();
  } else {
    setBjControls(true, true);
  }
});

bjStandBtn.addEventListener('click', () => {
  if (!bjRoundActive) return;
  finishBjRound();
});

bjDoubleBtn.addEventListener('click', () => {
  if (!bjRoundActive) return;
  if (bjBet > state.balance) return;
  state.balance -= bjBet;
  bjBet *= 2;
  renderBalance();
  saveState();
  bjPlayerHand.push(bjDeck.pop());
  renderBjTable(true);
  finishBjRound();
});

function finishBjRound() {
  bjRoundActive = false;
  const playerScore = handScore(bjPlayerHand);

  let dealerScore = handScore(bjDealerHand);
  if (playerScore <= 21) {
    while (dealerScore < 17) {
      bjDealerHand.push(bjDeck.pop());
      dealerScore = handScore(bjDealerHand);
    }
  }

  renderBjTable(false);
  setBjControls(false, false);

  let resultText, delta;
  const isBlackjack = bjPlayerHand.length === 2 && playerScore === 21;

  if (playerScore > 21) {
    resultText = t('bjBust') + ' ' + t('bjLose');
    delta = -bjBet;
  } else if (isBlackjack && !(bjDealerHand.length === 2 && dealerScore === 21)) {
    delta = Math.round(bjBet * 1.5);
    state.balance += bjBet + delta;
    resultText = t('bjBlackjack');
  } else if (dealerScore > 21) {
    delta = bjBet;
    state.balance += bjBet + delta;
    resultText = t('bjDealerBust') + ' ' + t('bjWin');
  } else if (playerScore > dealerScore) {
    delta = bjBet;
    state.balance += bjBet + delta;
    resultText = t('bjWin');
  } else if (playerScore === dealerScore) {
    delta = 0;
    state.balance += bjBet;
    resultText = t('bjPush');
  } else {
    delta = -bjBet;
    resultText = t('bjLose');
  }

  bjResult.textContent = resultText;
  bjResult.style.color = delta > 0 ? 'var(--profit-pos)' : (delta < 0 ? 'var(--profit-neg)' : 'var(--muted)');

  renderBalance();
  addHistory('blackjack', t('tabBlackjack'), bjBet, resultText, delta);
}

// ============================================================
// ROULETTE (European, 0-36)
// ============================================================
const rbBetInput = document.getElementById('rbBetInput');
const rbChipRow = document.getElementById('rbChipRow');
const rbOptions = document.querySelectorAll('.rb-option');
const rbSpinBtn = document.getElementById('rbSpinBtn');
const rbResult = document.getElementById('rbResult');
const rouletteWheel = document.getElementById('rouletteWheel');
const rouletteBall = document.getElementById('rouletteBall');
const rouletteCenterNumber = document.getElementById('rouletteCenterNumber');
const rouletteTable = document.getElementById('rouletteTable');

chipRowHandler(rbChipRow, rbBetInput);

// European roulette wheel order (0-36) as laid out on a real wheel
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function numberColor(n) {
  if (n === 0) return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

// build the mini table grid (0 + 1..36 in 3 columns like a real roulette table)
function buildRouletteTable() {
  rouletteTable.innerHTML = '';
  const zero = document.createElement('div');
  zero.className = 'roulette-cell green';
  zero.style.gridColumn = '1 / span 13';
  zero.textContent = '0';
  zero.setAttribute('data-num', '0');
  rouletteTable.appendChild(zero);

  for (let n = 1; n <= 36; n++) {
    const cell = document.createElement('div');
    cell.className = 'roulette-cell ' + numberColor(n);
    cell.textContent = n;
    cell.setAttribute('data-num', n);
    rouletteTable.appendChild(cell);
  }
}
buildRouletteTable();

let rbSelectedColor = null;
rbOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    rbSelectedColor = opt.getAttribute('data-color');
    rbOptions.forEach(o => o.classList.toggle('selected', o === opt));
  });
});

let rbWheelRotation = 0;
let rbBallRotation = 0;

rbSpinBtn.addEventListener('click', () => {
  const bet = parseFloat(rbBetInput.value);
  if (isNaN(bet) || bet <= 0) {
    rbResult.textContent = t('placeBetFirst');
    return;
  }
  if (!rbSelectedColor) {
    rbResult.textContent = t('rbPickTitle');
    return;
  }
  if (bet > state.balance) {
    rbResult.textContent = t('notEnoughBalance');
    return;
  }

  state.balance -= bet;
  renderBalance();
  saveState();

  rbSpinBtn.disabled = true;
  rbResult.textContent = t('rbSpinning');
  rbResult.style.color = 'var(--muted)';
  rouletteWheel.classList.add('spinning');
  rouletteCenterNumber.textContent = '?';
  rouletteTable.querySelectorAll('.roulette-cell').forEach(c => c.classList.remove('highlight'));

  // pick winning number
  const winningNumber = Math.floor(Math.random() * 37);
  const segmentAngle = 360 / WHEEL_ORDER.length;
  const winningIndex = WHEEL_ORDER.indexOf(winningNumber);

  // spin wheel several full turns and land the winning segment at the top pointer
  const wheelExtraTurns = 4 + Math.floor(Math.random() * 3);
  const targetWheelAngle = -(winningIndex * segmentAngle);
  rbWheelRotation += 360 * wheelExtraTurns;
  const finalWheelRotation = rbWheelRotation + targetWheelAngle - (rbWheelRotation % 360);
  rbWheelRotation = finalWheelRotation;
  rouletteWheel.style.transform = `rotate(${rbWheelRotation}deg)`;

  // ball spins opposite direction, several turns
  const ballExtraTurns = 6 + Math.floor(Math.random() * 3);
  rbBallRotation += 360 * ballExtraTurns + (Math.random() * 360);
  rouletteBall.style.transform = `rotate(${rbBallRotation}deg) translateX(0)`;

  setTimeout(() => {
    rouletteWheel.classList.remove('spinning');
    rouletteCenterNumber.textContent = winningNumber;

    const outcome = numberColor(winningNumber);
    const cell = rouletteTable.querySelector(`.roulette-cell[data-num="${winningNumber}"]`);
    if (cell) cell.classList.add('highlight');

    let delta;
    const colorLabel = t('color' + outcome.charAt(0).toUpperCase() + outcome.slice(1));

    if (outcome === rbSelectedColor) {
      const multiplier = outcome === 'green' ? 14 : 2;
      delta = bet * multiplier - bet;
      state.balance += bet * multiplier;
      rbResult.textContent = t('rbWin', { number: winningNumber, color: colorLabel }) + ` (+${formatMoney(delta)})`;
      rbResult.style.color = 'var(--profit-pos)';
    } else {
      delta = -bet;
      rbResult.textContent = t('rbLose', { number: winningNumber, color: colorLabel });
      rbResult.style.color = 'var(--profit-neg)';
    }

    renderBalance();
    addHistory('redblack', t('tabRedBlack'), bet, rbResult.textContent, delta);
    rbSpinBtn.disabled = false;
  }, 3300);
});

// ============================================================
// DICE
// ============================================================
const diceBetInput = document.getElementById('diceBetInput');
const diceChipRow = document.getElementById('diceChipRow');
const diceOptionsEl = document.getElementById('diceOptions');
const diceRollBtn = document.getElementById('diceRollBtn');
const die1 = document.getElementById('die1');
const die2 = document.getElementById('die2');
const diceResult = document.getElementById('diceResult');

chipRowHandler(diceChipRow, diceBetInput);

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const DICE_PAYOUTS = {
  2: 30, 3: 15, 4: 10, 5: 7, 6: 5, 7: 4, 8: 5, 9: 7, 10: 10, 11: 15, 12: 30
};

let diceSelected = null;

function buildDiceOptions() {
  diceOptionsEl.innerHTML = '';
  for (let sum = 2; sum <= 12; sum++) {
    const btn = document.createElement('div');
    btn.className = 'dice-option';
    btn.setAttribute('data-sum', sum);
    btn.textContent = `${sum} (x${DICE_PAYOUTS[sum]})`;
    btn.addEventListener('click', () => {
      diceSelected = sum;
      diceOptionsEl.querySelectorAll('.dice-option').forEach(el => {
        el.classList.toggle('selected', el === btn);
      });
    });
    diceOptionsEl.appendChild(btn);
  }
}
buildDiceOptions();

diceRollBtn.addEventListener('click', () => {
  const bet = parseFloat(diceBetInput.value);
  if (isNaN(bet) || bet <= 0) {
    diceResult.textContent = t('placeBetFirst');
    return;
  }
  if (diceSelected == null) {
    diceResult.textContent = t('diceTitle');
    return;
  }
  if (bet > state.balance) {
    diceResult.textContent = t('notEnoughBalance');
    return;
  }

  state.balance -= bet;
  renderBalance();
  saveState();

  diceRollBtn.disabled = true;
  die1.classList.add('rolling');
  die2.classList.add('rolling');

  let ticks = 0;
  const rollInterval = setInterval(() => {
    die1.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
    die2.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
    ticks++;
    if (ticks > 8) {
      clearInterval(rollInterval);
      const roll1 = 1 + Math.floor(Math.random() * 6);
      const roll2 = 1 + Math.floor(Math.random() * 6);
      die1.textContent = DICE_FACES[roll1 - 1];
      die2.textContent = DICE_FACES[roll2 - 1];
      die1.classList.remove('rolling');
      die2.classList.remove('rolling');

      const sum = roll1 + roll2;
      let delta;
      if (sum === diceSelected) {
        const multiplier = DICE_PAYOUTS[sum];
        delta = bet * multiplier - bet;
        state.balance += bet * multiplier;
        diceResult.textContent = t('diceWin', { sum }) + ` (+${formatMoney(delta)})`;
        diceResult.style.color = 'var(--profit-pos)';
      } else {
        delta = -bet;
        diceResult.textContent = t('diceLose', { sum });
        diceResult.style.color = 'var(--profit-neg)';
      }

      renderBalance();
      addHistory('dice', t('tabDice'), bet, diceResult.textContent, delta);
      diceRollBtn.disabled = false;
    }
  }, 80);
});

// ---------- Animated background particles ----------
function initParticles() {
  const bgParticles = document.getElementById('bgParticles');
  const count = 24;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const size = 2 + Math.random() * 4;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (12 + Math.random() * 18) + 's';
    p.style.animationDelay = (Math.random() * 20) + 's';
    bgParticles.appendChild(p);
  }
}
initParticles();

// ---------- Render all ----------
function renderAll() {
  applyTheme();
  renderBalance();
  renderHistory();
}

tryAutoLogin();
