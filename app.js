const STORAGE_KEY = "ahmed-game-accounts-v1";

const games = {
  overwatch: {
    name: "Overwatch",
  },
  valorant: {
    name: "Valorant",
  },
  arc: {
    name: "ARC Raiders",
  },
};

const emptyStore = () => ({
  activeGame: "overwatch",
  accounts: {
    overwatch: [],
    valorant: [],
    arc: [],
  },
});

const elements = {
  tabs: document.querySelectorAll(".game-tab"),
  openAddAccount: document.querySelector("#openAddAccount"),
  gamePanel: document.querySelector("#gamePanel"),
  closeGamePanel: document.querySelector("#closeGamePanel"),
  panelGameName: document.querySelector("#panelGameName"),
  gamePickerModal: document.querySelector("#gamePickerModal"),
  accountModal: document.querySelector("#accountModal"),
  gamePickers: document.querySelectorAll("[data-pick-game]"),
  formGameName: document.querySelector("#formGameName"),
  form: document.querySelector("#accountForm"),
  imageInput: document.querySelector("#accountImage"),
  imagePreview: document.querySelector("#imagePreview"),
  uploadBox: document.querySelector(".upload-box"),
  uploadText: document.querySelector("#uploadText"),
  info: document.querySelector("#accountInfo"),
  price: document.querySelector("#accountPrice"),
  pendingList: document.querySelector("#pendingList"),
  deliveredList: document.querySelector("#deliveredList"),
  pendingCount: document.querySelector("#pendingCount"),
  deliveredCount: document.querySelector("#deliveredCount"),
  activeTotal: document.querySelector("#activeTotal"),
  globalTotal: document.querySelector("#globalTotal"),
};

let store = loadStore();
let selectedImage = "";
let selectedFormGame = store.activeGame;

function loadStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !saved.accounts) {
      return emptyStore();
    }

    return {
      ...emptyStore(),
      ...saved,
      accounts: {
        ...emptyStore().accounts,
        ...saved.accounts,
      },
    };
  } catch {
    return emptyStore();
  }
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatPrice(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getAccounts(gameId = store.activeGame) {
  return store.accounts[gameId] || [];
}

function sumDelivered(accounts) {
  return accounts
    .filter((account) => account.delivered)
    .reduce((total, account) => total + (Number(account.price) || 0), 0);
}

function getGlobalDeliveredTotal() {
  return Object.values(store.accounts).reduce((total, accounts) => total + sumDelivered(accounts), 0);
}

function openGamePanel(gameId) {
  store.activeGame = gameId;
  saveStore();
  elements.gamePanel.classList.add("is-open");
  elements.gamePanel.setAttribute("aria-hidden", "false");
  render();
}

function closeGamePanel() {
  elements.gamePanel.classList.remove("is-open");
  elements.gamePanel.setAttribute("aria-hidden", "true");
}

function openModal(modal) {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function closeAllModals() {
  closeModal(elements.gamePickerModal);
  closeModal(elements.accountModal);
}

function openAddFlow() {
  closeModal(elements.accountModal);
  openModal(elements.gamePickerModal);
}

function openAccountForm(gameId) {
  selectedFormGame = gameId;
  elements.formGameName.textContent = games[gameId].name;
  resetForm();
  closeModal(elements.gamePickerModal);
  openModal(elements.accountModal);
}

function resetForm() {
  selectedImage = "";
  elements.form.reset();
  elements.imagePreview.removeAttribute("src");
  elements.uploadBox.classList.remove("has-image");
  elements.uploadText.textContent = "Upload account image";
}

function createAccountCard(account) {
  const card = document.createElement("article");
  card.className = "account-card";

  card.innerHTML = `
    <img src="${account.image}" alt="Account screenshot" />
    <div class="account-body">
      <p class="account-info"></p>
      <div class="account-meta">
        <span class="price-pill">${formatPrice(account.price)}</span>
        <span class="date-text">${formatDate(account.createdAt)}</span>
      </div>
      <div class="card-actions">
        <button class="glass-button deliver-button" type="button" data-action="deliver" data-id="${account.id}">Delivered</button>
        <button class="glass-button pending-button" type="button" data-action="pending" data-id="${account.id}">Not Delivered</button>
        <button class="glass-button delete-button" type="button" data-action="delete" data-id="${account.id}" aria-label="Delete account">Delete</button>
      </div>
    </div>
  `;

  card.querySelector(".account-info").textContent = account.info;
  card.querySelector('[data-action="deliver"]').disabled = account.delivered;
  card.querySelector('[data-action="pending"]').disabled = !account.delivered;

  return card;
}

function createEmptyState(text) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = text;
  return empty;
}

function renderList(listElement, accounts, emptyText) {
  listElement.textContent = "";

  if (!accounts.length) {
    listElement.append(createEmptyState(emptyText));
    return;
  }

  accounts.forEach((account) => {
    listElement.append(createAccountCard(account));
  });
}

function render() {
  const activeAccounts = getAccounts();
  const pendingAccounts = activeAccounts.filter((account) => !account.delivered);
  const deliveredAccounts = activeAccounts.filter((account) => account.delivered);

  elements.panelGameName.textContent = games[store.activeGame].name;
  elements.pendingCount.textContent = pendingAccounts.length;
  elements.deliveredCount.textContent = deliveredAccounts.length;
  elements.activeTotal.textContent = formatPrice(sumDelivered(activeAccounts));
  elements.globalTotal.textContent = formatPrice(getGlobalDeliveredTotal());

  renderList(elements.pendingList, pendingAccounts, "No pending accounts yet.");
  renderList(elements.deliveredList, deliveredAccounts, "No delivered accounts yet.");
}

function updateAccountStatus(accountId, delivered) {
  store.accounts[store.activeGame] = getAccounts().map((account) =>
    account.id === accountId ? { ...account, delivered } : account,
  );
  saveStore();
  render();
}

function deleteAccount(accountId) {
  const confirmed = window.confirm("Delete this account?");
  if (!confirmed) {
    return;
  }

  store.accounts[store.activeGame] = getAccounts().filter((account) => account.id !== accountId);
  saveStore();
  render();
}

function handleListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, id } = button.dataset;

  if (action === "deliver") {
    updateAccountStatus(id, true);
  }

  if (action === "pending") {
    updateAccountStatus(id, false);
  }

  if (action === "delete") {
    deleteAccount(id);
  }
}

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => openGamePanel(tab.dataset.game));
});

elements.openAddAccount.addEventListener("click", openAddFlow);
elements.closeGamePanel.addEventListener("click", closeGamePanel);

document.querySelectorAll("[data-close-modal]").forEach((closeButton) => {
  closeButton.addEventListener("click", closeAllModals);
});

elements.gamePickers.forEach((picker) => {
  picker.addEventListener("click", () => openAccountForm(picker.dataset.pickGame));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAllModals();
    closeGamePanel();
  }
});

elements.imageInput.addEventListener("change", () => {
  const [file] = elements.imageInput.files;
  if (!file) {
    selectedImage = "";
    elements.imagePreview.removeAttribute("src");
    elements.uploadBox.classList.remove("has-image");
    elements.uploadText.textContent = "Upload account image";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    selectedImage = String(reader.result);
    elements.imagePreview.src = selectedImage;
    elements.uploadBox.classList.add("has-image");
    elements.uploadText.textContent = "Change image";
  });
  reader.readAsDataURL(file);
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();

  const info = elements.info.value.trim();
  const price = Number(elements.price.value);

  if (!selectedImage || !info || Number.isNaN(price)) {
    return;
  }

  const account = {
    id: `${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    image: selectedImage,
    info,
    price,
    delivered: false,
    createdAt: Date.now(),
  };

  store.accounts[selectedFormGame] = [account, ...getAccounts(selectedFormGame)];
  store.activeGame = selectedFormGame;
  saveStore();
  closeModal(elements.accountModal);
  resetForm();
  openGamePanel(selectedFormGame);
});

elements.pendingList.addEventListener("click", handleListClick);
elements.deliveredList.addEventListener("click", handleListClick);

render();
