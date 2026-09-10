export const translations = {
  uk: {
    appTitle: 'Казино Radmir',
    settingsTitle: 'Налаштування',
    settingsLang: 'Мова',
    settingsTheme: 'Тема',
    themeDark: 'Темна',
    themeLight: 'Світла',
    themePurple: 'Фіолетова',
    close: 'Закрити',
    logoutBtn: 'Скинути акаунт',
    resetConfirm: 'Скинути баланс і всю історію ставок?',
    balance: 'Баланс',
    topUpBtn: '+ Поповнити',
    topUpPrompt: 'На скільки поповнити баланс?',

    tabBlackjack: '🃏 Блекджек',
    tabRedBlack: '🎡 Чорне/Червоне',
    tabDice: '🎲 Кості',

    historyTitle: 'Історія ставок',
    thGame: 'Гра',
    thBet: 'Ставка',
    thResult: 'Результат',
    thBalance: 'Баланс після',
    thTime: 'Час',
    emptyHistory: 'Ще немає жодної ставки',
    totalLabel: 'Загальний виграш/програш:',

    betLabel: 'Розмір ставки',
    dealBtn: 'Роздати',
    hitBtn: 'Ще карту',
    standBtn: 'Досить',
    doubleBtn: 'Подвоїти',
    newRoundBtn: 'Нова роздача',
    dealerLabel: 'Дилер',
    playerLabel: 'Гравець',
    bjWin: 'Ви виграли!',
    bjLose: 'Ви програли',
    bjPush: 'Нічия',
    bjBlackjack: 'Блекджек! 🎉',
    bjBust: 'Перебір!',
    bjDealerBust: 'У дилера перебір!',
    notEnoughBalance: 'Недостатньо коштів на балансі',
    placeBetFirst: 'Спершу зробіть ставку',

    rbPickTitle: 'Оберіть колір',
    rbRed: 'Червоне',
    rbBlack: 'Чорне',
    rbGreen: 'Зеро (x14)',
    rbSpinBtn: 'Крутити',
    rbWin: 'Випало {color}! Ви виграли',
    rbLose: 'Випало {color}. Ви програли',

    diceTitle: 'Вгадайте суму кубиків (2-12)',
    diceRollBtn: 'Кинути кості',
    diceWin: 'Випало {sum}! Ви вгадали, виграш',
    diceLose: 'Випало {sum}. Не вгадали',

    colorRed: 'червоне',
    colorBlack: 'чорне',
    colorGreen: 'зеро',
  },
  ru: {
    appTitle: 'Казино Radmir',
    settingsTitle: 'Настройки',
    settingsLang: 'Язык',
    settingsTheme: 'Тема',
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
    themePurple: 'Фиолетовая',
    close: 'Закрыть',
    logoutBtn: 'Сбросить аккаунт',
    resetConfirm: 'Сбросить баланс и всю историю ставок?',
    balance: 'Баланс',
    topUpBtn: '+ Пополнить',
    topUpPrompt: 'На сколько пополнить баланс?',

    tabBlackjack: '🃏 Блэкджек',
    tabRedBlack: '🎡 Чёрное/Красное',
    tabDice: '🎲 Кости',

    historyTitle: 'История ставок',
    thGame: 'Игра',
    thBet: 'Ставка',
    thResult: 'Результат',
    thBalance: 'Баланс после',
    thTime: 'Время',
    emptyHistory: 'Ещё нет ни одной ставки',
    totalLabel: 'Общий выигрыш/проигрыш:',

    betLabel: 'Размер ставки',
    dealBtn: 'Раздать',
    hitBtn: 'Ещё карту',
    standBtn: 'Хватит',
    doubleBtn: 'Удвоить',
    newRoundBtn: 'Новая раздача',
    dealerLabel: 'Дилер',
    playerLabel: 'Игрок',
    bjWin: 'Вы выиграли!',
    bjLose: 'Вы проиграли',
    bjPush: 'Ничья',
    bjBlackjack: 'Блэкджек! 🎉',
    bjBust: 'Перебор!',
    bjDealerBust: 'У дилера перебор!',
    notEnoughBalance: 'Недостаточно средств на балансе',
    placeBetFirst: 'Сначала сделайте ставку',

    rbPickTitle: 'Выберите цвет',
    rbRed: 'Красное',
    rbBlack: 'Чёрное',
    rbGreen: 'Зеро (x14)',
    rbSpinBtn: 'Крутить',
    rbWin: 'Выпало {color}! Вы выиграли',
    rbLose: 'Выпало {color}. Вы проиграли',

    diceTitle: 'Угадайте сумму костей (2-12)',
    diceRollBtn: 'Бросить кости',
    diceWin: 'Выпало {sum}! Вы угадали, выигрыш',
    diceLose: 'Выпало {sum}. Не угадали',

    colorRed: 'красное',
    colorBlack: 'чёрное',
    colorGreen: 'зеро',
  }
};

let currentLang = localStorage.getItem('casinoLang') || 'uk';

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('casinoLang', lang);
  applyTranslations();
}

export function t(key, vars) {
  let str = (translations[currentLang] && translations[currentLang][key]) || key;
  if (vars) {
    Object.keys(vars).forEach(k => {
      str = str.replace(`{${k}}`, vars[k]);
    });
  }
  return str;
}

export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.setAttribute('title', t(key));
  });
  document.documentElement.lang = currentLang;
}
