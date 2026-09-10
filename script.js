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
  redblack: document.getElementById('redblackGame')
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
// ROULETTE (American, 0-36 + 00)
// ============================================================
const rbBetInput = document.getElementById('rbBetInput');
const rbChipRow = document.getElementById('rbChipRow');
const rbSpinBtn = document.getElementById('rbSpinBtn');
const rbClearBtn = document.getElementById('rbClearBtn');
const rbResult = document.getElementById('rbResult');
const rouletteWheel = document.getElementById('rouletteWheel');
const rouletteBall = document.getElementById('rouletteBall');
const rouletteCenterNumber = document.getElementById('rouletteCenterNumber');
const rouletteTableUS = document.getElementById('rouletteTableUS');
const rbCurrentBetLabel = document.getElementById('rbCurrentBetLabel');

chipRowHandler(rbChipRow, rbBetInput);

// American roulette wheel order (0, 1-36, 00) as laid out on a real double-zero wheel
const WHEEL_ORDER = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function numberColor(n) {
  if (n === 0 || n === '00') return 'green';
  return RED_NUMBERS.has(n) ? 'red' : 'black';
}

// bet type -> { numbers: [...], payout: multiplier }
let rbBets = {}; // key -> amount staked on that bet key

function betNumbers(key) {
  if (key.startsWith('n:')) return [key === 'n:00' ? '00' : parseInt(key.slice(2), 10)];
  if (key === 'red') return [...Array(37).keys()].filter(n => n > 0 && RED_NUMBERS.has(n));
  if (key === 'black') return [...Array(37).keys()].filter(n => n > 0 && !RED_NUMBERS.has(n));
  if (key === 'even') return [...Array(37).keys()].filter(n => n > 0 && n % 2 === 0);
  if (key === 'odd') return [...Array(37).keys()].filter(n => n > 0 && n % 2 === 1);
  if (key === 'low') return [...Array(19).keys()].filter(n => n >= 1 && n <= 18);
  if (key === 'high') return [...Array(37).keys()].filter(n => n >= 19 && n <= 36);
  if (key === 'dozen1') return [...Array(37).keys()].filter(n => n >= 1 && n <= 12);
  if (key === 'dozen2') return [...Array(37).keys()].filter(n => n >= 13 && n <= 24);
  if (key === 'dozen3') return [...Array(37).keys()].filter(n => n >= 25 && n <= 36);
  if (key === 'col1') return [...Array(37).keys()].filter(n => n > 0 && n % 3 === 1);
  if (key === 'col2') return [...Array(37).keys()].filter(n => n > 0 && n % 3 === 2);
  if (key === 'col3') return [...Array(37).keys()].filter(n => n > 0 && n % 3 === 0);
  return [];
}

function betPayout(key) {
  if (key.startsWith('n:')) return 35;
  if (['dozen1', 'dozen2', 'dozen3', 'col1', 'col2', 'col3'].includes(key)) return 2;
  return 1; // red/black/even/odd/low/high
}

// build American roulette betting table (0, 00, 1-36 grid + outside bets)
function buildRouletteTableUS() {
  rouletteTableUS.innerHTML = '';

  const zeros = document.createElement('div');
  zeros.className = 'rt-zeros';
  const zero0 = makeNumCell(0, 'n:0');
  const zero00 = makeNumCell('00', 'n:00');
  zeros.appendChild(zero0);
  zeros.appendChild(zero00);
  rouletteTableUS.appendChild(zeros);

  const grid = document.createElement('div');
  grid.className = 'rt-grid';
  for (let row = 0; row < 12; row++) {
    for (let col = 2; col >= 0; col--) {
      const n = row * 3 + col + 1;
      grid.appendChild(makeNumCell(n, 'n:' + n));
    }
  }
  rouletteTableUS.appendChild(grid);

  const columnsCol = document.createElement('div');
  columnsCol.className = 'rt-2to1-col';
  ['col3', 'col2', 'col1'].forEach(key => {
    columnsCol.appendChild(makeOutsideCell('2 to 1', key));
  });
  rouletteTableUS.appendChild(columnsCol);

  const dozens = document.createElement('div');
  dozens.className = 'rt-dozens';
  dozens.appendChild(makeOutsideCell(t('rbDozen1'), 'dozen1'));
  dozens.appendChild(makeOutsideCell(t('rbDozen2'), 'dozen2'));
  dozens.appendChild(makeOutsideCell(t('rbDozen3'), 'dozen3'));
  rouletteTableUS.appendChild(dozens);

  const outside = document.createElement('div');
  outside.className = 'rt-outside';
  outside.appendChild(makeOutsideCell(t('rbLow'), 'low'));
  outside.appendChild(makeOutsideCell(t('rbEven'), 'even'));
  outside.appendChild(makeOutsideCell('♦', 'red', 'red'));
  outside.appendChild(makeOutsideCell('♠', 'black', 'black'));
  outside.appendChild(makeOutsideCell(t('rbOdd'), 'odd'));
  outside.appendChild(makeOutsideCell(t('rbHigh'), 'high'));
  rouletteTableUS.appendChild(outside);
}

function makeNumCell(n, key) {
  const cell = document.createElement('div');
  cell.className = 'rt-num ' + numberColor(n) + (n === 0 || n === '00' ? ' rt-zero' : '');
  cell.textContent = n;
  cell.setAttribute('data-key', key);
  cell.setAttribute('data-num', n);
  cell.appendChild(chipBadge(key));
  cell.addEventListener('click', () => placeBetOnKey(key));
  return cell;
}

function makeOutsideCell(label, key, colorClass) {
  const cell = document.createElement('div');
  cell.className = 'rt-outside-cell' + (colorClass ? ' ' + colorClass : '');
  cell.textContent = label;
  cell.setAttribute('data-key', key);
  cell.appendChild(chipBadge(key));
  cell.addEventListener('click', () => placeBetOnKey(key));
  return cell;
}

function chipBadge(key) {
  const badge = document.createElement('span');
  badge.className = 'rt-chip-badge hidden';
  badge.setAttribute('data-badge-for', key);
  return badge;
}

function placeBetOnKey(key) {
  const amount = parseFloat(rbBetInput.value);
  if (isNaN(amount) || amount <= 0) {
    rbResult.textContent = t('placeBetFirst');
    rbResult.style.color = 'var(--profit-neg)';
    return;
  }
  const totalStaked = Object.values(rbBets).reduce((s, v) => s + v, 0);
  if (totalStaked + amount > state.balance) {
    rbResult.textContent = t('notEnoughBalance');
    rbResult.style.color = 'var(--profit-neg)';
    return;
  }
  rbBets[key] = (rbBets[key] || 0) + amount;
  renderRbBets();
}

function renderRbBets() {
  rouletteTableUS.querySelectorAll('.rt-chip-badge').forEach(b => {
    const key = b.getAttribute('data-badge-for');
    if (rbBets[key]) {
      b.textContent = formatMoney(rbBets[key]);
      b.classList.remove('hidden');
    } else {
      b.classList.add('hidden');
    }
  });
  const total = Object.values(rbBets).reduce((s, v) => s + v, 0);
  rbCurrentBetLabel.textContent = total > 0 ? t('rbTotalBet', { amount: formatMoney(total) }) : '';
}

buildRouletteTableUS();

rbClearBtn.addEventListener('click', () => {
  rbBets = {};
  renderRbBets();
  rbResult.textContent = '';
});

let rbWheelRotation = 0;
let rbBallRotation = 0;

rbSpinBtn.addEventListener('click', () => {
  const totalStaked = Object.values(rbBets).reduce((s, v) => s + v, 0);
  if (totalStaked <= 0) {
    rbResult.textContent = t('rbPickTitle');
    rbResult.style.color = 'var(--profit-neg)';
    return;
  }
  if (totalStaked > state.balance) {
    rbResult.textContent = t('notEnoughBalance');
    return;
  }

  state.balance -= totalStaked;
  renderBalance();
  saveState();

  rbSpinBtn.disabled = true;
  rbClearBtn.disabled = true;
  rbResult.textContent = t('rbSpinning');
  rbResult.style.color = 'var(--muted)';
  rouletteWheel.classList.add('spinning');
  rouletteCenterNumber.textContent = '?';
  rouletteTableUS.querySelectorAll('.rt-num').forEach(c => c.classList.remove('highlight'));

  // pick winning number (0-36 + 00), each equally likely among 38 slots
  const winningNumber = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
  const segmentAngle = 360 / WHEEL_ORDER.length;
  const winningIndex = WHEEL_ORDER.indexOf(winningNumber);

  const wheelExtraTurns = 4 + Math.floor(Math.random() * 3);
  const targetWheelAngle = -(winningIndex * segmentAngle);
  rbWheelRotation += 360 * wheelExtraTurns;
  const finalWheelRotation = rbWheelRotation + targetWheelAngle - (rbWheelRotation % 360);
  rbWheelRotation = finalWheelRotation;
  rouletteWheel.style.transform = `rotate(${rbWheelRotation}deg)`;

  const ballExtraTurns = 6 + Math.floor(Math.random() * 3);
  rbBallRotation += 360 * ballExtraTurns + (Math.random() * 360);
  rouletteBall.style.transform = `rotate(${rbBallRotation}deg) translateX(0)`;

  setTimeout(() => {
    rouletteWheel.classList.remove('spinning');
    rouletteCenterNumber.textContent = winningNumber;

    const cell = rouletteTableUS.querySelector(`.rt-num[data-num="${winningNumber}"]`);
    if (cell) cell.classList.add('highlight');

    let totalPayout = 0;
    let totalDelta;
    Object.keys(rbBets).forEach(key => {
      const nums = betNumbers(key);
      if (nums.includes(winningNumber)) {
        const stake = rbBets[key];
        const payout = betPayout(key);
        totalPayout += stake + stake * payout;
      }
    });
    totalDelta = totalPayout - totalStaked;
    state.balance += totalPayout;

    const outcome = numberColor(winningNumber);
    const colorLabel = t('color' + outcome.charAt(0).toUpperCase() + outcome.slice(1));

    if (totalDelta > 0) {
      rbResult.textContent = t('rbWin', { number: winningNumber, color: colorLabel }) + ` (+${formatMoney(totalDelta)})`;
      rbResult.style.color = 'var(--profit-pos)';
    } else {
      rbResult.textContent = t('rbLose', { number: winningNumber, color: colorLabel });
      rbResult.style.color = 'var(--profit-neg)';
    }

    renderBalance();
    addHistory('redblack', t('tabRedBlack'), totalStaked, rbResult.textContent, totalDelta);
    rbBets = {};
    renderRbBets();
    rbSpinBtn.disabled = false;
    rbClearBtn.disabled = false;
  }, 3300);
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
