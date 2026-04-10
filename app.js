// Shared state
let wallets = JSON.parse(localStorage.getItem("wallets")) || [];
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let categories = JSON.parse(localStorage.getItem("categories")) || {};
let recurringTransactions = JSON.parse(localStorage.getItem("recurringTransactions")) || [];
let budgets = JSON.parse(localStorage.getItem("budgets")) || {};

// Save data
function saveData() {
  localStorage.setItem("wallets", JSON.stringify(wallets));
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("categories", JSON.stringify(categories));
  localStorage.setItem("recurringTransactions", JSON.stringify(recurringTransactions));
  localStorage.setItem("budgets", JSON.stringify(budgets));
}

// -------------------- DASHBOARD --------------------
if (document.getElementById("dashboard")) {
  const totalBalance = document.getElementById("totalBalance");
  const monthlyIncome = document.getElementById("monthlyIncome");
  const monthlyExpenses = document.getElementById("monthlyExpenses");
  const recentTransactions = document.getElementById("recentTransactions");

  function updateDashboard() {
    const income = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    monthlyIncome.textContent = `$${income}`;
    monthlyExpenses.textContent = `$${expenses}`;
    totalBalance.textContent = `Total Balance: $${wallets.reduce((sum, w) => sum + w.balance, 0)}`;
    recentTransactions.innerHTML = "";
    transactions.slice(-5).forEach(t => {
      const wallet = wallets.find(w => w.id === t.walletId);
      const walletName = wallet ? wallet.name : "";
      const detail = t.type === "expense" ? `${t.category}` : "";
      const li = document.createElement("li");
      li.textContent = `${t.type} - $${t.amount} ${walletName ? " ("+walletName+")" : ""} ${detail}`;
      recentTransactions.appendChild(li);
    });
  }

  updateDashboard();
}

// -------------------- WALLETS --------------------
if (document.getElementById("wallets")) {
  const walletForm = document.getElementById("walletForm");
  const walletList = document.getElementById("walletList");

  walletForm.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("walletName").value;
    const type = document.getElementById("walletType").value;
    const balance = parseFloat(document.getElementById("walletBalance").value);
    wallets.push({ id: Date.now(), name, type, balance });
    saveData();
    updateWallets();
    walletForm.reset();
  });

  function updateWallets() {
    walletList.innerHTML = "";
    wallets.forEach(wallet => {
      const li = document.createElement("li");
      li.textContent = `${wallet.name} (${wallet.type}): $${wallet.balance}`;
      walletList.appendChild(li);
    });
  }

  updateWallets();
}

// -------------------- TRANSACTIONS --------------------
if (document.getElementById("transactions")) {
  const transactionTypeSelect = document.getElementById("transactionType");
  const incomeForm = document.getElementById("incomeForm");
  const expenseForm = document.getElementById("expenseForm");
  const transferForm = document.getElementById("transferForm");
  const transactionList = document.getElementById("transactionList");

  // Helper: handle category input (dropdown + manual entry)
  function handleCategory(selectId, inputId) {
    let category = document.getElementById(selectId)?.value || "";
    const newCategory = document.getElementById(inputId)?.value.trim();
    if (newCategory) category = newCategory;
    if (category) categories[category] = (categories[category] || 0);
    return category;
  }

  // Populate categories in dropdowns
  function populateCategories() {
    const selects = [
      document.getElementById("expenseCategorySelect"),
      document.getElementById("transferCategorySelect")
    ];
    selects.forEach(select => {
      if (!select) return;
      select.innerHTML = '<option value="">-- Select existing category --</option>';
      Object.keys(categories).forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
      });
    });
  }

  transactionTypeSelect.addEventListener("change", () => {
    [incomeForm, expenseForm, transferForm].forEach(f => f.classList.add("hidden"));
    if (transactionTypeSelect.value === "income") incomeForm.classList.remove("hidden");
    if (transactionTypeSelect.value === "expense") expenseForm.classList.remove("hidden");
    if (transactionTypeSelect.value === "transfer") transferForm.classList.remove("hidden");
  });

  // Income form: amount + wallet only
  incomeForm.addEventListener("submit", e => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("incomeAmount").value);
    const walletId = parseInt(document.getElementById("incomeWallet").value);
    addTransaction("income", amount, walletId, null);
    incomeForm.reset();
    updateTransactions();
    updateDashboard();
  });

  // Expense form: amount + category + wallet
  expenseForm.addEventListener("submit", e => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("expenseAmount").value);
    const walletId = parseInt(document.getElementById("expenseWallet").value);
    const category = handleCategory("expenseCategorySelect","expenseCategoryInput");
    addTransaction("expense", amount, walletId, category);
    expenseForm.reset();
    updateTransactions();
    updateDashboard();
    populateCategories();
  });

  // Transfer form: amount + from/to wallets (optional category)
  transferForm.addEventListener("submit", e => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("transferAmount").value);
    const fromWalletId = parseInt(document.getElementById("fromWallet").value);
    const toWalletId = parseInt(document.getElementById("toWallet").value);
    const category = handleCategory("transferCategorySelect","transferCategoryInput");
    addTransaction("transfer", amount, fromWalletId, category, toWalletId);
    transferForm.reset();
    updateTransactions();
    updateDashboard();
    populateCategories();
  });

  function addTransaction(type, amount, walletId, category=null, targetWalletId=null, recurring=false, frequency=null) {
    const wallet = wallets.find(w => w.id === walletId);
    if(type === "income") wallet.balance += amount;
    if(type === "expense") {
      wallet.balance -= amount;
      if (category) categories[category] = (categories[category] || 0) + amount;
    }
    if(type === "transfer") {
      wallet.balance -= amount;
      wallets.find(w => w.id === targetWalletId).balance += amount;
    }
    const transaction = { id: Date.now(), type, amount, walletId, category, targetWalletId, date: new Date() };
    transactions.push(transaction);
    if(recurring) recurringTransactions.push({ ...transaction, frequency });
    saveData();
  }

  function updateTransactions() {
    transactionList.innerHTML = "";
    transactions.forEach(t => {
      const wallet = wallets.find(w => w.id === t.walletId);
      const walletName = wallet ? wallet.name : "";
      const targetWallet = wallets.find(w => w.id === t.targetWalletId);
      const targetName = targetWallet ? targetWallet.name : "";
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${t.type}</td>
        <td>$${t.amount}</td>
        <td>${t.category || "-"}</td>
        <td>${walletName}${targetName ? " → " + targetName : ""}</td>
        <td>${new Date(t.date).toLocaleString()}</td>
        <td><button onclick="deleteTransaction(${t.id})">❌ Delete</button></td>
      `;
      transactionList.appendChild(row);
    });
  }

  window.deleteTransaction = function(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveData();
    updateTransactions();
    updateDashboard();
  };

  updateTransactions();
  populateCategories();
}

// -------------------- BUDGETS --------------------
if (document.getElementById("budgets")) {
  budgetForm.addEventListener("submit", e => {
    e.preventDefault();
    const category = document.getElementById("budgetCategory").value;
    const amount = parseFloat(document.getElementById("budgetAmount").value);
    budgets[category] = amount;
    saveData();
    updateBudgets();
    budgetForm.reset();
  });

  function updateBudgets() {
    budgetList.innerHTML = "";
    Object.keys(budgets).forEach(cat => {
      const spent = categories[cat] || 0;
      const budget = budgets[cat];
            const percent = Math.min((spent / budget) * 100, 100);
      const statusClass = spent > budget ? "red" : "green";
      const li = document.createElement("li");
      li.innerHTML = `
        <strong>${cat}</strong>: $${spent} / $${budget}
        <div class="progress-bar">
          <div class="progress-fill ${statusClass}" style="width:${percent}%"></div>
        </div>
        ${spent > budget ? "<p style='color:red;'>⚠ Budget exceeded!</p>" : ""}
      `;
      budgetList.appendChild(li);
    });
  }

  updateBudgets();
}

// -------------------- ANALYTICS --------------------
if (document.getElementById("analytics")) {
  let chart;
  function updateChart() {
    const ctx = document.getElementById("categoryChart").getContext("2d");
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(categories),
        datasets: [{
          data: Object.values(categories),
          backgroundColor: ["#FF6384","#36A2EB","#FFCE56","#4CAF50","#9966FF"]
        }]
      }
    });
  }
  updateChart();
}