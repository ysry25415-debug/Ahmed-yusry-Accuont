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
  openDeletedAccounts: document.querySelector("#openDeletedAccounts"),
  gamePanel: document.querySelector("#gamePanel"),
  closeGamePanel: document.querySelector("#closeGamePanel"),
  panelGameName: document.querySelector("#panelGameName"),
  gamePickerModal: document.querySelector("#gamePickerModal"),
  accountModal: document.querySelector("#accountModal"),
  deletedModal: document.querySelector("#deletedModal"),
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
  deletedList: document.querySelector("#deletedList"),
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

function getAccountStatus(account) {
  if (account.status) {
    return account.status;
  }

  if (account.deleted) {
    return "deleted";
  }

  return account.delivered ? "delivered" : "pending";
}

function sumDelivered(accounts) {
  return accounts
    .filter((account) => getAccountStatus(account) === "delivered")
    .reduce((total, account) => total + (Number(account.price) || 0), 0);
}

function getGlobalDeliveredTotal() {
  return Object.values(store.accounts).reduce((total, accounts) => total + sumDelivered(accounts), 0);
}

function getDeletedAccounts() {
  return Object.entries(store.accounts).flatMap(([gameId, accounts]) =>
    accounts
      .filter((account) => getAccountStatus(account) === "deleted")
      .map((account) => ({ account, gameId })),
  );
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
  closeModal(elements.deletedModal);
}

function openAddFlow() {
  closeModal(elements.accountModal);
  closeModal(elements.deletedModal);
  openModal(elements.gamePickerModal);
}

function openDeletedAccounts() {
  closeModal(elements.gamePickerModal);
  closeModal(elements.accountModal);
  renderDeletedAccounts();
  openModal(elements.deletedModal);
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

function createAccountCard(account, gameId = store.activeGame, options = {}) {
  const card = document.createElement("article");
  card.className = "account-card";
  const status = getAccountStatus(account);
  const gameAttribute = `data-game="${gameId}"`;
  const actions =
    status === "deleted"
      ? `
        <button class="glass-button restore-button" type="button" data-action="restore" data-id="${account.id}" ${gameAttribute}>Restore</button>
        <button class="glass-button deliver-button" type="button" data-action="deliver" data-id="${account.id}" ${gameAttribute}>Restore Delivered</button>
      `
      : `
        <button class="glass-button deliver-button" type="button" data-action="deliver" data-id="${account.id}" ${gameAttribute}>Delivered</button>
        <button class="glass-button pending-button" type="button" data-action="pending" data-id="${account.id}" ${gameAttribute}>Not Delivered</button>
        <button class="glass-button delete-button" type="button" data-action="delete" data-id="${account.id}" ${gameAttribute} aria-label="Delete account">Delete</button>
      `;
  const gameTag = options.showGame ? `<span class="account-game-tag">${games[gameId].name}</span>` : "";

  card.innerHTML = `
    <img src="${account.image}" alt="Account screenshot" />
    <div class="account-body">
      ${gameTag}
      <p class="account-info"></p>
      <div class="account-meta">
        <span class="price-pill">${formatPrice(account.price)}</span>
        <span class="date-text">${formatDate(account.createdAt)}</span>
      </div>
      <div class="card-actions">
        ${actions}
      </div>
    </div>
  `;

  card.querySelector(".account-info").textContent = account.info;
  const deliverButton = card.querySelector('[data-action="deliver"]');
  const pendingButton = card.querySelector('[data-action="pending"]');
  if (deliverButton && status !== "deleted") {
    deliverButton.disabled = status === "delivered";
  }
  if (pendingButton) {
    pendingButton.disabled = status === "pending";
  }

  return card;
}

function createEmptyState(text) {
  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = text;
  return empty;
}

function renderList(listElement, accounts, emptyText, options = {}) {
  listElement.textContent = "";

  if (!accounts.length) {
    listElement.append(createEmptyState(emptyText));
    return;
  }

  accounts.forEach((account) => {
    listElement.append(createAccountCard(account, options.gameId || store.activeGame, options));
  });
}

function renderDeletedAccounts() {
  elements.deletedList.textContent = "";
  const deletedAccounts = getDeletedAccounts();

  if (!deletedAccounts.length) {
    elements.deletedList.append(createEmptyState("No deleted accounts yet."));
    return;
  }

  deletedAccounts.forEach(({ account, gameId }) => {
    elements.deletedList.append(createAccountCard(account, gameId, { showGame: true }));
  });
}

function render() {
  const activeAccounts = getAccounts();
  const pendingAccounts = activeAccounts.filter((account) => getAccountStatus(account) === "pending");
  const deliveredAccounts = activeAccounts.filter((account) => getAccountStatus(account) === "delivered");

  elements.panelGameName.textContent = games[store.activeGame].name;
  elements.pendingCount.textContent = pendingAccounts.length;
  elements.deliveredCount.textContent = deliveredAccounts.length;
  elements.activeTotal.textContent = formatPrice(sumDelivered(activeAccounts));
  elements.globalTotal.textContent = formatPrice(getGlobalDeliveredTotal());

  renderList(elements.pendingList, pendingAccounts, "No pending accounts yet.", { gameId: store.activeGame });
  renderList(elements.deliveredList, deliveredAccounts, "No delivered accounts yet.", { gameId: store.activeGame });
  if (elements.deletedModal.classList.contains("is-open")) {
    renderDeletedAccounts();
  }
}

function updateAccountStatus(accountId, status, gameId = store.activeGame) {
  store.accounts[gameId] = getAccounts(gameId).map((account) => {
    if (account.id !== accountId) {
      return account;
    }

    return {
      ...account,
      status,
      delivered: status === "delivered",
      deleted: status === "deleted",
      deletedAt: status === "deleted" ? Date.now() : null,
    };
  });
  store.activeGame = gameId;
  saveStore();
  render();
}

function deleteAccount(accountId, gameId) {
  const confirmed = window.confirm("Move this account to Deleted Accounts?");
  if (!confirmed) {
    return;
  }

  updateAccountStatus(accountId, "deleted", gameId);
}

function handleListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, id, game } = button.dataset;
  const gameId = game || store.activeGame;

  if (action === "deliver") {
    updateAccountStatus(id, "delivered", gameId);
  }

  if (action === "pending") {
    updateAccountStatus(id, "pending", gameId);
  }

  if (action === "restore") {
    updateAccountStatus(id, "pending", gameId);
  }

  if (action === "delete") {
    deleteAccount(id, gameId);
  }
}

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => openGamePanel(tab.dataset.game));
});

elements.openAddAccount.addEventListener("click", openAddFlow);
elements.openDeletedAccounts.addEventListener("click", openDeletedAccounts);
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
    status: "pending",
    delivered: false,
    deleted: false,
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
elements.deletedList.addEventListener("click", handleListClick);

render();
