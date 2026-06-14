const STORAGE_KEY = "ahmed-game-accounts-v1";
const ACCOUNTS_API = "/api/accounts";

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
  description: document.querySelector("#offerDescription"),
  info: document.querySelector("#accountInfo"),
  price: document.querySelector("#accountPrice"),
  pendingList: document.querySelector("#pendingList"),
  deliveredList: document.querySelector("#deliveredList"),
  soldList: document.querySelector("#soldList"),
  deletedList: document.querySelector("#deletedList"),
  pendingCount: document.querySelector("#pendingCount"),
  deliveredCount: document.querySelector("#deliveredCount"),
  soldCount: document.querySelector("#soldCount"),
  activeTotal: document.querySelector("#activeTotal"),
  globalTotal: document.querySelector("#globalTotal"),
  accountModalTitle: document.querySelector("#accountModalTitle"),
  formSubmitButton: document.querySelector("#formSubmitButton"),
};

let store = loadStore();
let selectedImage = "";
let selectedFormGame = store.activeGame;
let editingAccountId = null;
let remoteEnabled = false;

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

async function requestAccountsApi(path = "", options = {}) {
  const response = await fetch(`${ACCOUNTS_API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message || payload.error || "Accounts API request failed.");
  }

  return payload;
}

function accountFromRow(row) {
  const status = row.status || (row.sold ? "sold" : row.deleted ? "deleted" : row.delivered ? "delivered" : "pending");

  return {
    id: row.id,
    image: row.image || "",
    description: row.description || "",
    info: row.info || "",
    price: Number(row.price) || 0,
    status,
    delivered: status === "delivered",
    sold: status === "sold",
    deleted: status === "deleted",
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : null,
    deletedAt: row.deleted_at ? Date.parse(row.deleted_at) : null,
  };
}

function rowFromAccount(account, gameId) {
  const status = getAccountStatus(account);

  return {
    id: account.id,
    game_id: gameId,
    image: account.image || "",
    description: account.description || "",
    info: account.info || "",
    price: Number(account.price) || 0,
    status,
    delivered: status === "delivered",
    sold: status === "sold",
    deleted: status === "deleted",
    created_at: new Date(account.createdAt || Date.now()).toISOString(),
    updated_at: account.updatedAt ? new Date(account.updatedAt).toISOString() : null,
    deleted_at: account.deletedAt ? new Date(account.deletedAt).toISOString() : null,
  };
}

async function loadRemoteAccounts() {
  try {
    const localStore = loadStore();
    const payload = await requestAccountsApi();
    const remoteStore = emptyStore();

    (payload.accounts || []).forEach((row) => {
      if (remoteStore.accounts[row.game_id]) {
        remoteStore.accounts[row.game_id].push(accountFromRow(row));
      }
    });

    remoteEnabled = true;
    store = mergeStores(remoteStore, localStore);
    saveStore();
    render();
    await uploadMissingLocalAccounts(localStore, remoteStore);
  } catch (error) {
    remoteEnabled = false;
    console.warn("Supabase sync is not available. Using local browser storage.", error);
  }
}

async function createRemoteAccount(account, gameId) {
  if (!remoteEnabled) {
    return;
  }

  try {
    await requestAccountsApi("", {
      method: "POST",
      body: JSON.stringify({ account: rowFromAccount(account, gameId) }),
    });
  } catch (error) {
    console.warn("Could not create account in Supabase.", error);
  }
}

async function updateRemoteAccount(account, gameId) {
  if (!remoteEnabled) {
    return;
  }

  try {
    await requestAccountsApi(`?id=${encodeURIComponent(account.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ account: rowFromAccount(account, gameId) }),
    });
  } catch (error) {
    console.warn("Could not update account in Supabase.", error);
  }
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

  if (account.sold) {
    return "sold";
  }

  return account.delivered ? "delivered" : "pending";
}

function sumAmountDue(accounts) {
  return accounts
    .filter((account) => ["delivered", "sold"].includes(getAccountStatus(account)))
    .reduce((total, account) => total + (Number(account.price) || 0), 0);
}

function getGlobalAmountDueTotal() {
  return Object.values(store.accounts).reduce((total, accounts) => total + sumAmountDue(accounts), 0);
}

function getDeletedAccounts() {
  return Object.entries(store.accounts).flatMap(([gameId, accounts]) =>
    accounts
      .filter((account) => getAccountStatus(account) === "deleted")
      .map((account) => ({ account, gameId })),
  );
}

function getSoldAccounts() {
  return Object.entries(store.accounts).flatMap(([gameId, accounts]) =>
    accounts
      .filter((account) => getAccountStatus(account) === "sold")
      .map((account) => ({ account, gameId })),
  );
}

function getAllAccounts(sourceStore = store) {
  return Object.entries(sourceStore.accounts).flatMap(([gameId, accounts]) =>
    accounts.map((account) => ({ account, gameId })),
  );
}

function mergeStores(remoteStore, localStore) {
  const mergedStore = {
    ...remoteStore,
    activeGame: localStore.activeGame || remoteStore.activeGame,
    accounts: {
      overwatch: [...remoteStore.accounts.overwatch],
      valorant: [...remoteStore.accounts.valorant],
      arc: [...remoteStore.accounts.arc],
    },
  };

  Object.entries(localStore.accounts).forEach(([gameId, accounts]) => {
    const remoteIds = new Set(mergedStore.accounts[gameId].map((account) => account.id));
    accounts.forEach((account) => {
      if (!remoteIds.has(account.id)) {
        mergedStore.accounts[gameId].push(account);
      }
    });
  });

  return mergedStore;
}

async function uploadMissingLocalAccounts(localStore, remoteStore) {
  const remoteIds = new Set(getAllAccounts(remoteStore).map(({ account }) => account.id));
  const missingAccounts = getAllAccounts(localStore).filter(({ account }) => !remoteIds.has(account.id));

  await Promise.all(missingAccounts.map(({ account, gameId }) => createRemoteAccount(account, gameId)));
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
  editingAccountId = null;
  elements.formGameName.textContent = games[gameId].name;
  elements.accountModalTitle.textContent = "Add Account";
  elements.formSubmitButton.textContent = "Save Account";
  resetForm();
  closeModal(elements.gamePickerModal);
  openModal(elements.accountModal);
}

function resetForm() {
  selectedImage = "";
  elements.form.reset();
  elements.imageInput.value = "";
  elements.imagePreview.removeAttribute("src");
  elements.uploadBox.classList.remove("has-image");
  elements.uploadText.textContent = "Upload account image";
}

function openEditForm(accountId, gameId) {
  const account = getAccounts(gameId).find((item) => item.id === accountId);
  if (!account) {
    return;
  }

  selectedFormGame = gameId;
  editingAccountId = accountId;
  selectedImage = account.image;
  elements.form.reset();
  elements.imageInput.value = "";
  elements.formGameName.textContent = games[gameId].name;
  elements.accountModalTitle.textContent = "Edit Account";
  elements.formSubmitButton.textContent = "Save Changes";
  elements.description.value = account.description || "";
  elements.info.value = account.info || "";
  elements.price.value = account.price ?? "";
  elements.imagePreview.src = account.image;
  elements.uploadBox.classList.add("has-image");
  elements.uploadText.textContent = "Change image";
  closeAllModals();
  openModal(elements.accountModal);
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
        <button class="glass-button sold-button" type="button" data-action="sold" data-id="${account.id}" ${gameAttribute}>Restore Sold</button>
        <button class="glass-button edit-button" type="button" data-action="edit" data-id="${account.id}" ${gameAttribute}>Edit</button>
      `
      : `
        <button class="glass-button edit-button" type="button" data-action="edit" data-id="${account.id}" ${gameAttribute}>Edit</button>
        <button class="glass-button deliver-button" type="button" data-action="deliver" data-id="${account.id}" ${gameAttribute}>Delivered</button>
        <button class="glass-button sold-button" type="button" data-action="sold" data-id="${account.id}" ${gameAttribute}>Sold</button>
        <button class="glass-button pending-button" type="button" data-action="pending" data-id="${account.id}" ${gameAttribute}>Not Delivered</button>
        <button class="glass-button delete-button" type="button" data-action="delete" data-id="${account.id}" ${gameAttribute} aria-label="Delete account">Delete</button>
      `;
  const gameTag = options.showGame ? `<span class="account-game-tag">${games[gameId].name}</span>` : "";
  const description = account.description || "No offer description added.";

  card.innerHTML = `
    <img src="${account.image}" alt="Account screenshot" />
    <div class="account-body">
      ${gameTag}
      <p class="offer-description"></p>
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

  card.querySelector(".offer-description").textContent = description;
  card.querySelector(".account-info").textContent = account.info;
  const deliverButton = card.querySelector('[data-action="deliver"]');
  const soldButton = card.querySelector('[data-action="sold"]');
  const pendingButton = card.querySelector('[data-action="pending"]');
  if (deliverButton && status !== "deleted") {
    deliverButton.disabled = status === "delivered";
  }
  if (soldButton) {
    soldButton.disabled = status === "sold";
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
  const soldAccounts = activeAccounts.filter((account) => getAccountStatus(account) === "sold");

  elements.panelGameName.textContent = games[store.activeGame].name;
  elements.pendingCount.textContent = pendingAccounts.length;
  elements.deliveredCount.textContent = deliveredAccounts.length;
  elements.soldCount.textContent = soldAccounts.length;
  elements.activeTotal.textContent = formatPrice(sumAmountDue(activeAccounts));
  elements.globalTotal.textContent = formatPrice(getGlobalAmountDueTotal());

  renderList(elements.pendingList, pendingAccounts, "No pending accounts yet.", { gameId: store.activeGame });
  renderList(elements.deliveredList, deliveredAccounts, "No delivered accounts yet.", { gameId: store.activeGame });
  renderList(elements.soldList, soldAccounts, "No sold accounts yet.", { gameId: store.activeGame });
  if (elements.deletedModal.classList.contains("is-open")) {
    renderDeletedAccounts();
  }
}

async function updateAccountStatus(accountId, status, gameId = store.activeGame) {
  let updatedAccount = null;

  store.accounts[gameId] = getAccounts(gameId).map((account) => {
    if (account.id !== accountId) {
      return account;
    }

    updatedAccount = {
      ...account,
      status,
      delivered: status === "delivered",
      sold: status === "sold",
      deleted: status === "deleted",
      deletedAt: status === "deleted" ? Date.now() : null,
      updatedAt: Date.now(),
    };
    return updatedAccount;
  });
  store.activeGame = gameId;
  saveStore();
  render();

  if (updatedAccount) {
    await updateRemoteAccount(updatedAccount, gameId);
  }
}

async function deleteAccount(accountId, gameId) {
  const confirmed = window.confirm("Move this account to Deleted Accounts?");
  if (!confirmed) {
    return;
  }

  await updateAccountStatus(accountId, "deleted", gameId);
}

async function handleListClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const { action, id, game } = button.dataset;
  const gameId = game || store.activeGame;

  if (action === "deliver") {
    await updateAccountStatus(id, "delivered", gameId);
  }

  if (action === "sold") {
    await updateAccountStatus(id, "sold", gameId);
  }

  if (action === "pending") {
    await updateAccountStatus(id, "pending", gameId);
  }

  if (action === "restore") {
    await updateAccountStatus(id, "pending", gameId);
  }

  if (action === "delete") {
    await deleteAccount(id, gameId);
  }

  if (action === "edit") {
    openEditForm(id, gameId);
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

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const description = elements.description.value.trim();
  const info = elements.info.value.trim();
  const price = Number(elements.price.value);

  if (!selectedImage || !description || !info || Number.isNaN(price)) {
    return;
  }

  if (editingAccountId) {
    let updatedAccount = null;
    store.accounts[selectedFormGame] = getAccounts(selectedFormGame).map((account) => {
      if (account.id !== editingAccountId) {
        return account;
      }

      updatedAccount = {
        ...account,
        image: selectedImage,
        description,
        info,
        price,
        updatedAt: Date.now(),
      };
      return updatedAccount;
    });
    store.activeGame = selectedFormGame;
    saveStore();
    closeModal(elements.accountModal);
    editingAccountId = null;
    resetForm();
    openGamePanel(selectedFormGame);
    if (updatedAccount) {
      await updateRemoteAccount(updatedAccount, selectedFormGame);
    }
    return;
  }

  const account = {
    id: `${Date.now()}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    image: selectedImage,
    description,
    info,
    price,
    status: "pending",
    delivered: false,
    sold: false,
    deleted: false,
    createdAt: Date.now(),
  };

  store.accounts[selectedFormGame] = [account, ...getAccounts(selectedFormGame)];
  store.activeGame = selectedFormGame;
  saveStore();
  await createRemoteAccount(account, selectedFormGame);
  closeModal(elements.accountModal);
  resetForm();
  openGamePanel(selectedFormGame);
});

elements.pendingList.addEventListener("click", handleListClick);
elements.deliveredList.addEventListener("click", handleListClick);
elements.soldList.addEventListener("click", handleListClick);
elements.deletedList.addEventListener("click", handleListClick);

render();
loadRemoteAccounts();
