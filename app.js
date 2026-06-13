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
  form: document.querySelector("#accountForm"),
  imageInput: document.querySelector("#accountImage"),
  imagePreview: document.querySelector("#imagePreview"),
  uploadBox: document.querySelector(".upload-box"),
  uploadText: document.querySelector("#uploadText"),
  info: document.querySelector("#accountInfo"),
  price: document.querySelector("#accountPrice"),
  activeGameName: document.querySelector("#activeGameName"),
  pendingList: document.querySelector("#pendingList"),
  deliveredList: document.querySelector("#deliveredList"),
  pendingCount: document.querySelector("#pendingCount"),
  deliveredCount: document.querySelector("#deliveredCount"),
  activeTotal: document.querySelector("#activeTotal"),
  globalTotal: document.querySelector("#globalTotal"),
};

let store = loadStore();
let selectedImage = "";

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
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getActiveAccounts() {
  return store.accounts[store.activeGame] || [];
}

function sumDelivered(accounts) {
  return accounts
    .filter((account) => account.delivered)
    .reduce((total, account) => total + (Number(account.price) || 0), 0);
}

function getGlobalDeliveredTotal() {
  return Object.values(store.accounts).reduce((total, accounts) => total + sumDelivered(accounts), 0);
}

function setActiveGame(gameId) {
  store.activeGame = gameId;
  saveStore();
  resetForm();
  render();
}

function resetForm() {
  selectedImage = "";
  elements.form.reset();
  elements.imagePreview.removeAttribute("src");
  elements.uploadBox.classList.remove("has-image");
  elements.uploadText.textContent = "ارفع صورة الحساب";
}

function createAccountCard(account) {
  const card = document.createElement("article");
  card.className = "account-card";

  const media = account.image
    ? `<img src="${account.image}" alt="صورة الحساب" />`
    : `<div class="image-fallback">No Image</div>`;

  card.innerHTML = `
    ${media}
    <div class="account-body">
      <p class="account-info"></p>
      <div class="account-meta">
        <span class="price-pill">${formatPrice(account.price)}</span>
        <span class="date-text">${formatDate(account.createdAt)}</span>
      </div>
      <div class="card-actions">
        <button class="glass-button deliver-button" type="button" data-action="deliver" data-id="${account.id}">تم التسليم</button>
        <button class="glass-button pending-button" type="button" data-action="pending" data-id="${account.id}">لم يتم التسليم</button>
        <button class="glass-button delete-button" type="button" data-action="delete" data-id="${account.id}" aria-label="حذف الحساب">حذف</button>
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
  const activeAccounts = getActiveAccounts();
  const pendingAccounts = activeAccounts.filter((account) => !account.delivered);
  const deliveredAccounts = activeAccounts.filter((account) => account.delivered);
  const activeTotal = sumDelivered(activeAccounts);
  const globalTotal = getGlobalDeliveredTotal();

  elements.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.game === store.activeGame);
  });

  elements.activeGameName.textContent = games[store.activeGame].name;
  elements.pendingCount.textContent = pendingAccounts.length;
  elements.deliveredCount.textContent = deliveredAccounts.length;
  elements.activeTotal.textContent = formatPrice(activeTotal);
  elements.globalTotal.textContent = `كل الألعاب: ${formatPrice(globalTotal)}`;

  renderList(elements.pendingList, pendingAccounts, "لا توجد حسابات غير مسلمة");
  renderList(elements.deliveredList, deliveredAccounts, "لا توجد حسابات مسلمة");
}

function updateAccountStatus(accountId, delivered) {
  store.accounts[store.activeGame] = getActiveAccounts().map((account) =>
    account.id === accountId ? { ...account, delivered } : account,
  );
  saveStore();
  render();
}

function deleteAccount(accountId) {
  const confirmed = window.confirm("هل تريد حذف هذا الحساب؟");
  if (!confirmed) {
    return;
  }

  store.accounts[store.activeGame] = getActiveAccounts().filter((account) => account.id !== accountId);
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
  tab.addEventListener("click", () => setActiveGame(tab.dataset.game));
});

elements.imageInput.addEventListener("change", () => {
  const [file] = elements.imageInput.files;
  if (!file) {
    selectedImage = "";
    elements.imagePreview.removeAttribute("src");
    elements.uploadBox.classList.remove("has-image");
    elements.uploadText.textContent = "ارفع صورة الحساب";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    selectedImage = String(reader.result);
    elements.imagePreview.src = selectedImage;
    elements.uploadBox.classList.add("has-image");
    elements.uploadText.textContent = "تغيير الصورة";
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

  store.accounts[store.activeGame] = [account, ...getActiveAccounts()];
  saveStore();
  resetForm();
  render();
});

elements.pendingList.addEventListener("click", handleListClick);
elements.deliveredList.addEventListener("click", handleListClick);

render();
