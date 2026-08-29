// LocalStorage Persistence
let store = JSON.parse(localStorage.getItem('prowler_data')) || {
  countries: [],
  accounts: [],
  entries: [],
  debts: [],
  categories: ['Fuel', 'Groceries', 'Salary', 'Food', 'Shopping', 'Utilities']
};

let currentView = 'countries';
let selectedCountryId = null;
let maskedStates = {};
let calendarDate = new Date(); // Always defaults to current system date

function saveState() {
  localStorage.setItem('prowler_data', JSON.stringify(store));
}

// SVG Eye Icons
const eyeOpenSVG = `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
const eyeClosedSVG = `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.17c0-1.66-1.34-3-3-3l-.17.02z"/></svg>`;

// Flag Lookup Helper
function getFlagEmoji(countryName) {
  const codeMap = {
    'usa': '🇺🇸', 'united states': '🇺🇸', 'us': '🇺🇸', 'uk': '🇬🇧', 'united kingdom': '🇬🇧',
    'japan': '🇯🇵', 'canada': '🇨🇦', 'india': '🇮🇳', 'australia': '🇦🇺', 'germany': '🇩🇪',
    'france': '🇫🇷', 'uae': '🇦🇪', 'saudi arabia': '🇸🇦'
  };
  const key = countryName.trim().toLowerCase();
  return codeMap[key] || '🌐';
}

function render() {
  const main = document.getElementById('view-content');
  const headerTitle = document.getElementById('header-title');
  const backBtn = document.getElementById('nav-back-btn');
  const calBtn = document.getElementById('header-calendar-btn');

  main.innerHTML = '';

  if (currentView === 'countries') {
    headerTitle.innerText = 'Countries';
    backBtn.classList.add('hidden');
    calBtn.classList.add('hidden');

    if (store.countries.length === 0) {
      main.innerHTML = `<p style="text-align:center; color: var(--text-muted); margin-top:2rem;">No countries added yet. Tap '+' to create one.</p>`;
      return;
    }

    store.countries.forEach(c => {
      const isMasked = maskedStates[`country_${c.id}`] !== false;
      const total = getCountryTotal(c.id);

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div onclick="selectCountry('${c.id}')" style="cursor:pointer; flex:1;">
          <h3>${c.flag} ${c.name}</h3>
          <small style="color:var(--text-muted)">${c.currency}</small>
        </div>
        <div class="card-actions">
          <div class="balance-text">
            <span>${isMasked ? '*****' : c.currency + ' ' + total.toFixed(2)}</span>
            <button class="eye-btn" onclick="toggleMask(event, 'country_${c.id}')">${isMasked ? eyeClosedSVG : eyeOpenSVG}</button>
          </div>
          <button class="icon-btn" onclick="openEditCountryModal(event, '${c.id}')">✏️</button>
          <button class="icon-btn" onclick="deleteCountry(event, '${c.id}')">🗑️</button>
        </div>
      `;
      main.appendChild(card);
    });

  } else if (currentView === 'country_detail') {
    const country = store.countries.find(c => c.id === selectedCountryId);
    headerTitle.innerText = `${country.flag} ${country.name}`;
    backBtn.classList.remove('hidden');
    calBtn.classList.remove('hidden');

    const total = getCountryTotal(country.id);
    const oweTotal = getActiveDebtTotal(country.id, 'owe');
    const owedTotal = getActiveDebtTotal(country.id, 'owed');
    const isMasked = maskedStates[`country_detail_${country.id}`] !== false;

    main.innerHTML = `
      <div class="card" style="flex-direction:column; align-items:flex-start; gap:8px;">
        <small style="color:var(--text-muted)">Total Assets</small>
        <div class="balance-text" style="font-size:1.4rem">
          <span>${isMasked ? '*****' : country.currency + ' ' + total.toFixed(2)}</span>
          <button class="eye-btn" onclick="toggleMask(event, 'country_detail_${country.id}')">${isMasked ? eyeClosedSVG : eyeOpenSVG}</button>
        </div>
        <button class="btn-primary" id="trigger-make-entry">+ Make Entry</button>
      </div>

      <h3 style="margin: 1rem 0 0.5rem 0; font-size:1rem; color: var(--text-muted);">Accounts</h3>
      <div id="accounts-list"></div>

      <div style="display:flex; gap:10px; margin-top: 1.2rem;">
        <button class="btn-primary" style="background:var(--card-border); color:var(--text-main); flex-direction:column; gap:2px;" onclick="openOweModal('owe')">
          <span>Money I Owe</span>
          <small style="color:var(--danger-red);">${country.currency} ${oweTotal.toFixed(2)}</small>
        </button>
        <button class="btn-primary" style="background:var(--card-border); color:var(--text-main); flex-direction:column; gap:2px;" onclick="openOweModal('owed')">
          <span>Money I'm Owed</span>
          <small style="color:var(--accent-green);">${country.currency} ${owedTotal.toFixed(2)}</small>
        </button>
      </div>
      <button class="btn-primary" style="margin-top:10px; background: transparent; border:1px solid var(--accent-primary); color:var(--text-main);" onclick="openEntryListModal()">📋 View Entry Ledger</button>
    `;

    document.getElementById('trigger-make-entry').onclick = () => openMakeEntryModal();
    renderAccountsList(country.id);
  }
}

function selectCountry(id) {
  selectedCountryId = id;
  currentView = 'country_detail';
  render();
}

function getCountryTotal(countryId) {
  return store.accounts
    .filter(a => a.countryId === countryId)
    .reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
}

function getActiveDebtTotal(countryId, type) {
  return store.debts
    .filter(d => d.countryId === countryId && d.type === type && !d.cleared)
    .reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
}

function renderAccountsList(countryId) {
  const container = document.getElementById('accounts-list');
  const accounts = store.accounts.filter(a => a.countryId === countryId);

  if (accounts.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size:0.85rem;">No accounts found. Tap '+' button to add an account.</p>`;
    return;
  }

  accounts.forEach(a => {
    const isMasked = maskedStates[`acc_${a.id}`] !== false;
    const item = document.createElement('div');
    item.className = 'card';
    item.style.borderLeft = `5px solid ${a.color || 'var(--accent-primary)'}`;
    item.innerHTML = `
      <div>
        <strong>${a.name}</strong> <small>(${a.type})</small>
      </div>
      <div class="card-actions">
        <div class="balance-text">
          <span>${isMasked ? '*****' : a.balance.toFixed(2)}</span>
          <button class="eye-btn" onclick="toggleMask(event, 'acc_${a.id}')">${isMasked ? eyeClosedSVG : eyeOpenSVG}</button>
        </div>
        <button class="icon-btn" onclick="deleteAccount(event, '${a.id}')">🗑️</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function toggleMask(e, key) {
  e.stopPropagation();
  maskedStates[key] = maskedStates[key] === false ? true : false;
  render();
}

// Navigation Events
document.getElementById('nav-back-btn').onclick = () => {
  currentView = 'countries';
  render();
};

document.getElementById('header-calendar-btn').onclick = () => {
  calendarDate = new Date(); // Reset to system date when calendar is opened
  openCalendarModal();
};

const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
document.getElementById('modal-close').onclick = () => modalOverlay.classList.add('hidden');

document.getElementById('main-fab').onclick = () => {
  if (currentView === 'countries') openAddCountryModal();
  else if (currentView === 'country_detail') openAddAccountModal();
};

// Country Actions
function openAddCountryModal() {
  modalBody.innerHTML = `
    <h3>Add Country</h3>
    <form id="add-country-form">
      <label>Country Name</label>
      <input type="text" id="c-name" required placeholder="e.g. Canada">
      <label>Currency Code</label>
      <input type="text" id="c-currency" required placeholder="e.g. CAD ($)">
      <button type="submit" class="btn-primary">Save Country</button>
    </form>
  `;
  modalOverlay.classList.remove('hidden');

  document.getElementById('add-country-form').onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('c-name').value;
    store.countries.push({
      id: Date.now().toString(),
      name: name,
      flag: getFlagEmoji(name),
      currency: document.getElementById('c-currency').value
    });
    saveState();
    modalOverlay.classList.add('hidden');
    render();
  };
}

function openEditCountryModal(e, id) {
  e.stopPropagation();
  const country = store.countries.find(c => c.id === id);
  modalBody.innerHTML = `
    <h3>Edit Country</h3>
    <form id="edit-country-form">
      <label>Country Name</label>
      <input type="text" id="ec-name" value="${country.name}" required>
      <label>Currency Code</label>
      <input type="text" id="ec-currency" value="${country.currency}" required>
      <button type="submit" class="btn-primary">Update Country</button>
    </form>
  `;
  modalOverlay.classList.remove('hidden');

  document.getElementById('edit-country-form').onsubmit = (e) => {
    e.preventDefault();
    country.name = document.getElementById('ec-name').value;
    country.flag = getFlagEmoji(country.name);
    country.currency = document.getElementById('ec-currency').value;
    saveState();
    modalOverlay.classList.add('hidden');
    render();
  };
}

function deleteCountry(e, id) {
  e.stopPropagation();
  if (confirm("Are you sure you want to delete this country and all associated accounts?")) {
    store.countries = store.countries.filter(c => c.id !== id);
    store.accounts = store.accounts.filter(a => a.countryId !== id);
    store.entries = store.entries.filter(e => e.countryId !== id);
    store.debts = store.debts.filter(d => d.countryId !== id);
    saveState();
    render();
  }
}

function deleteAccount(e, id) {
  e.stopPropagation();
  if (confirm("Are you sure you want to delete this account?")) {
    store.accounts = store.accounts.filter(a => a.id !== id);
    store.entries = store.entries.filter(e => e.accountId !== id);
    saveState();
    render();
  }
}

function openAddAccountModal() {
  modalBody.innerHTML = `
    <h3>Add Account</h3>
    <form id="add-acc-form">
      <label>Account Name</label>
      <input type="text" id="a-name" required placeholder="e.g. Checking Account">
      <label>Account Type (Select or Type New)</label>
      <input list="account-types" id="a-type" required placeholder="Type or select type...">
      <datalist id="account-types">
        <option value="Spending">
        <option value="Savings">
        <option value="Cash / Coins">
        <option value="Reward Cash">
      </datalist>
      <label>Initial Balance</label>
      <input type="number" step="0.01" id="a-balance" required placeholder="0.00">
      <label>Theme Color</label>
      <input type="color" id="a-color" value="#38bdf8" required style="height:40px;">
      <button type="submit" class="btn-primary">Save Account</button>
    </form>
  `;
  modalOverlay.classList.remove('hidden');

  document.getElementById('add-acc-form').onsubmit = (e) => {
    e.preventDefault();
    store.accounts.push({
      id: Date.now().toString(),
      countryId: selectedCountryId,
      name: document.getElementById('a-name').value,
      type: document.getElementById('a-type').value,
      balance: parseFloat(document.getElementById('a-balance').value),
      color: document.getElementById('a-color').value
    });
    saveState();
    modalOverlay.classList.add('hidden');
    render();
  };
}

// Fixed Make Entry Functionality
function openMakeEntryModal() {
  const accounts = store.accounts.filter(a => a.countryId === selectedCountryId);
  if (accounts.length === 0) {
    alert("Please add an account first.");
    return;
  }

  const accOptions = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  const catOptions = store.categories.map(c => `<option value="${c}">`).join('');

  modalBody.innerHTML = `
    <h3>Make Entry</h3>
    <form id="make-entry-form">
      <label>Entry Type</label>
      <select id="e-type">
        <option value="debit">Debit (-)</option>
        <option value="credit">Credit (+)</option>
      </select>
      <label>Account</label>
      <select id="e-account">${accOptions}</select>
      <label>Category</label>
      <input list="categories-list" id="e-category" placeholder="Type or choose category" required>
      <datalist id="categories-list">${catOptions}</datalist>
      <label>Amount</label>
      <input type="number" step="0.01" id="e-amount" required placeholder="0.00">
      <label>Date & Time</label>
      <input type="datetime-local" id="e-datetime" required>
      <button type="submit" class="btn-primary">Save Entry</button>
    </form>
  `;
  document.getElementById('e-datetime').value = new Date().toISOString().slice(0, 16);
  modalOverlay.classList.remove('hidden');

  document.getElementById('make-entry-form').onsubmit = (e) => {
    e.preventDefault();
    const accId = document.getElementById('e-account').value;
    const type = document.getElementById('e-type').value;
    const amt = parseFloat(document.getElementById('e-amount').value);
    const cat = document.getElementById('e-category').value;

    if (!store.categories.includes(cat)) store.categories.push(cat);

    const acc = store.accounts.find(a => a.id === accId);
    if (type === 'debit') acc.balance -= amt;
    else acc.balance += amt;

    store.entries.push({
      id: Date.now().toString(),
      countryId: selectedCountryId,
      accountId: accId,
      type: type,
      category: cat,
      amount: amt,
      datetime: document.getElementById('e-datetime').value
    });

    saveState();
    modalOverlay.classList.add('hidden');
    render();
  };
}

// Comprehensive Owe / Owed Ledger & Settlement System
function openOweModal(type) {
  const isOwe = type === 'owe';
  const debts = store.debts.filter(d => d.countryId === selectedCountryId && d.type === type);

  let rows = debts.map(d => `
    <tr style="opacity: ${d.cleared ? '0.4' : '1'}; text-decoration: ${d.cleared ? 'line-through' : 'none'};">
      <td>
        <input type="checkbox" ${d.cleared ? 'checked' : ''} onchange="toggleDebtCleared('${d.id}')">
      </td>
      <td>${d.person}</td>
      <td style="font-weight:600;">${d.amount.toFixed(2)}</td>
      <td>
        <button class="icon-btn" onclick="openEditDebtModal('${d.id}')">✏️</button>
        <button class="icon-btn" onclick="deleteDebt('${d.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');

  modalBody.innerHTML = `
    <h3>${isOwe ? 'Money I Owe' : "Money I'm Owed"}</h3>
    <table class="data-table" style="margin-bottom:1rem;">
      <thead>
        <tr>
          <th>Done</th>
          <th>Person</th>
          <th>Amount</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${rows.length ? rows : '<tr><td colspan="4" style="text-align:center;">No records found</td></tr>'}
      </tbody>
    </table>
    
    <button class="btn-primary" onclick="openAddDebtForm('${type}')">+ Record New Debt</button>
  `;
  modalOverlay.classList.remove('hidden');
}

function openAddDebtForm(type) {
  const isOwe = type === 'owe';
  modalBody.innerHTML = `
    <h3>${isOwe ? 'Add Owed Record' : 'Add Debt Record'}</h3>
    <form id="owe-form">
      <label>${isOwe ? 'Who you owe' : 'Who owes you'}</label>
      <input type="text" id="o-person" required placeholder="Person's Name">
      <label>Amount</label>
      <input type="number" step="0.01" id="o-amount" required placeholder="0.00">
      <label>Date & Time</label>
      <input type="datetime-local" id="o-datetime" required>
      <button type="submit" class="btn-primary">Save Record</button>
    </form>
  `;
  document.getElementById('o-datetime').value = new Date().toISOString().slice(0, 16);

  document.getElementById('owe-form').onsubmit = (e) => {
    e.preventDefault();
    store.debts.push({
      id: Date.now().toString(),
      countryId: selectedCountryId,
      type: type,
      person: document.getElementById('o-person').value,
      amount: parseFloat(document.getElementById('o-amount').value),
      datetime: document.getElementById('o-datetime').value,
      cleared: false
    });
    saveState();
    openOweModal(type);
    render();
  };
}

function toggleDebtCleared(debtId) {
  const debt = store.debts.find(d => d.id === debtId);
  debt.cleared = !debt.cleared;

  // Ask to automatically reflect settlement in an account balance
  if (debt.cleared) {
    const accounts = store.accounts.filter(a => a.countryId === selectedCountryId);
    if (accounts.length > 0 && confirm("Would you like to reflect this settled debt in your account balance?")) {
      const accId = prompt("Enter Account Name to update balance:\n" + accounts.map((a, i) => `${i+1}. ${a.name}`).join('\n'));
      const acc = accounts[parseInt(accId) - 1] || accounts[0];
      
      const entryType = debt.type === 'owe' ? 'debit' : 'credit';
      if (entryType === 'debit') acc.balance -= debt.amount;
      else acc.balance += debt.amount;

      store.entries.push({
        id: Date.now().toString(),
        countryId: selectedCountryId,
        accountId: acc.id,
        type: entryType,
        category: 'Debt Settlement',
        amount: debt.amount,
        datetime: new Date().toISOString().slice(0, 16)
      });
    }
  }

  saveState();
  openOweModal(debt.type);
  render();
}

function openEditDebtModal(debtId) {
  const debt = store.debts.find(d => d.id === debtId);
  modalBody.innerHTML = `
    <h3>Edit Debt Record</h3>
    <form id="edit-debt-form">
      <label>Person</label>
      <input type="text" id="ed-person" value="${debt.person}" required>
      <label>Amount</label>
      <input type="number" step="0.01" id="ed-amount" value="${debt.amount}" required>
      <button type="submit" class="btn-primary">Update Record</button>
    </form>
  `;

  document.getElementById('edit-debt-form').onsubmit = (e) => {
    e.preventDefault();
    debt.person = document.getElementById('ed-person').value;
    debt.amount = parseFloat(document.getElementById('ed-amount').value);
    saveState();
    openOweModal(debt.type);
    render();
  };
}

function deleteDebt(debtId) {
  const debt = store.debts.find(d => d.id === debtId);
  if (confirm("Delete this debt record?")) {
    store.debts = store.debts.filter(d => d.id !== debtId);
    saveState();
    openOweModal(debt.type);
    render();
  }
}

// Entry Ledger Table
function openEntryListModal() {
  const entries = store.entries.filter(e => e.countryId === selectedCountryId);
  
  let rows = entries.map(e => {
    const acc = store.accounts.find(a => a.id === e.accountId);
    return `
      <tr>
        <td>${e.datetime.replace('T', ' ')}</td>
        <td>${acc ? acc.name : '-'}</td>
        <td>${e.category}</td>
        <td style="color:${e.type === 'debit' ? 'var(--danger-red)' : 'var(--accent-green)'}">
          ${e.type === 'debit' ? '-' : '+'}${e.amount.toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');

  modalBody.innerHTML = `
    <h3>Entry Ledger</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Account</th>
          <th>Cat.</th>
          <th>Amt</th>
        </tr>
      </thead>
      <tbody>
        ${rows.length ? rows : '<tr><td colspan="4" style="text-align:center;">No entries recorded</td></tr>'}
      </tbody>
    </table>
  `;
  modalOverlay.classList.remove('hidden');
}

// Real-Time Calendar with Monthly Totals
function openCalendarModal() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  let daysHTML = '';
  for (let i = 0; i < firstDayIndex; i++) {
    daysHTML += `<div class="calendar-day empty"></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    daysHTML += `<div class="calendar-day">${day}</div>`;
  }

  // Calculate Monthly Totals
  const currentMonthEntries = store.entries.filter(e => {
    if (e.countryId !== selectedCountryId) return false;
    const d = new Date(e.datetime);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const totalDebited = currentMonthEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.amount, 0);
  const totalCredited = currentMonthEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.amount, 0);

  const currentMonthDebts = store.debts.filter(d => {
    if (d.countryId !== selectedCountryId || d.cleared) return false;
    const dt = new Date(d.datetime);
    return dt.getFullYear() === year && dt.getMonth() === month;
  });

  const monthOwe = currentMonthDebts.filter(d => d.type === 'owe').reduce((sum, d) => sum + d.amount, 0);
  const monthOwed = currentMonthDebts.filter(d => d.type === 'owed').reduce((sum, d) => sum + d.amount, 0);

  modalBody.innerHTML = `
    <h3>Activity Calendar</h3>
    <div class="calendar-header">
      <button class="icon-btn" onclick="changeMonth(-1)">◀</button>
      <h4>${monthNames[month]} ${year}</h4>
      <button class="icon-btn" onclick="changeMonth(1)">▶</button>
    </div>
    <div class="calendar-grid">
      <div class="calendar-day-header">Su</div>
      <div class="calendar-day-header">Mo</div>
      <div class="calendar-day-header">Tu</div>
      <div class="calendar-day-header">We</div>
      <div class="calendar-day-header">Th</div>
      <div class="calendar-day-header">Fr</div>
      <div class="calendar-day-header">Sa</div>
      ${daysHTML}
    </div>

    <div class="calendar-summary-box">
      <div class="summary-item">
        <small>Total Debited</small>
        <span style="color:var(--danger-red);">${totalDebited.toFixed(2)}</span>
      </div>
      <div class="summary-item">
        <small>Total Credited</small>
        <span style="color:var(--accent-green);">${totalCredited.toFixed(2)}</span>
      </div>
      <div class="summary-item" style="margin-top:6px;">
        <small>Owe Added</small>
        <span>${monthOwe.toFixed(2)}</span>
      </div>
      <div class="summary-item" style="margin-top:6px;">
        <small>Owed Added</small>
        <span>${monthOwed.toFixed(2)}</span>
      </div>
    </div>
  `;
  modalOverlay.classList.remove('hidden');
}

function changeMonth(delta) {
  calendarDate.setMonth(calendarDate.getMonth() + delta);
  openCalendarModal();
}

// Initial Load
render();