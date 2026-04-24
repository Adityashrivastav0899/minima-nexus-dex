// ---------- STATE ----------
const state = {
  initialized: false,
  connected: false,
  address: "",
  publicKey: "",
  orders: [
    { side: "BUY", amount: 100, price: 0.0071 },
    { side: "SELL", amount: 150, price: 0.0078 }
  ],
  trades: []
};

const $ = (id) => document.getElementById(id);

// ---------- DETECTION ----------
function hasMiniMask() {
  return typeof window !== "undefined" && typeof window.MINIMASK !== "undefined";
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function setStatus(text) {
  $("statusText").textContent = text;
}

// ---------- INIT ----------
let initPromise = null;

function callMiniMask(fn) {
  return new Promise((resolve, reject) => {
    try {
      fn((res) => resolve(res));
    } catch (err) {
      reject(err);
    }
  });
}

async function initMiniMask() {
  if (!hasMiniMask()) throw new Error("MiniMask not detected");

  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      window.MINIMASK.init(() => {
        state.initialized = true;
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });

  return initPromise;
}

// ---------- PARSE ----------
function parseAddress(res) {
  if (!res) return "";
  if (typeof res === "string") return res;
  return res.address || res.response?.address || res.data?.address || "";
}

function parsePublicKey(res) {
  if (!res) return "";
  if (typeof res === "string") return res;
  return res.publickey || res.publicKey || res.response?.publickey || "";
}

// ---------- CONNECT ----------
async function connectWallet() {
  try {
    if (isMobile() && !hasMiniMask()) {
      setStatus("Use desktop Chrome with MiniMask");
      return;
    }

    if (!hasMiniMask()) {
      setStatus("MiniMask not installed");
      return;
    }

    setStatus("Initializing...");
    await initMiniMask();

    setStatus("Fetching address...");
    const addrRes = await callMiniMask(window.MINIMASK.account.getAddress);
    const address = parseAddress(addrRes);

    if (!address) throw new Error("Could not get address");

    state.address = address;
    $("address").textContent = address;

    const pubRes = await callMiniMask(window.MINIMASK.account.getPublicKey);
    state.publicKey = parsePublicKey(pubRes);
    $("pubkey").textContent = state.publicKey;

    state.connected = true;

    // Enable buttons
    $("buyBtn").disabled = false;
    $("sellBtn").disabled = false;
    $("createOrderBtn").disabled = false;
    $("sendBtn").disabled = false;

    setStatus("Connected successfully");

    refreshWallet();
  } catch (err) {
    setStatus(err.message);
  }
}

// ---------- WALLET ----------
async function refreshWallet() {
  if (!state.connected) return;

  let data = {};

  try {
    data.balance = await callMiniMask(window.MINIMASK.account.balance);
  } catch (e) {
    data.balance = "Error";
  }

  try {
    data.coins = await callMiniMask(window.MINIMASK.account.coins);
  } catch (e) {
    data.coins = "Error";
  }

  $("walletOutput").textContent = JSON.stringify(data, null, 2);
}

// ---------- SWAP ----------
function calculateSwap() {
  const amount = Number($("payAmount").value || 0);
  const price = Number($("price").value || 0);

  $("receiveAmount").value = (amount * price).toFixed(6);
}

// ---------- ORDERBOOK ----------
function renderOrders() {
  $("orderbook").innerHTML = state.orders.map(o => {
    return `
      <tr>
        <td>${o.side}</td>
        <td>${o.amount}</td>
        <td>${o.price}</td>
        <td>${(o.amount * o.price).toFixed(4)}</td>
      </tr>
    `;
  }).join("");
}

function renderTrades() {
  $("tradeHistory").innerHTML = state.trades.length
    ? state.trades.map(t => `
      <tr>
        <td>MINIMA/USDT</td>
        <td>${t.action}</td>
        <td>${t.amount}</td>
        <td>${t.time}</td>
      </tr>
    `).join("")
    : "<tr><td colspan='4'>No trades yet</td></tr>";
}

// ---------- CREATE ORDER ----------
function createOrder(type = null) {
  if (!state.connected) {
    $("orderOutput").textContent = "Connect wallet first";
    return;
  }

  const side = type || $("orderType").value;
  const amount = Number($("orderAmount").value || $("payAmount").value);
  const price = Number($("orderPrice").value || $("price").value);

  if (!amount || !price) {
    $("orderOutput").textContent = "Enter amount and price";
    return;
  }

  const order = { side, amount, price };

  state.orders.push(order);

  state.trades.unshift({
    action: side,
    amount,
    time: new Date().toLocaleTimeString()
  });

  renderOrders();
  renderTrades();

  $("orderOutput").textContent = JSON.stringify(order, null, 2);
}

// ---------- SEND ----------
async function sendPayment() {
  if (!state.connected) return;

  const to = $("sendAddress").value;
  const amount = String($("sendAmount").value);
  const token = $("tokenId").value || "0x00";

  if (!to || !amount) {
    $("sendOutput").textContent = "Enter address & amount";
    return;
  }

  try {
    $("sendOutput").textContent = "Waiting for MiniMask...";

    const res = await new Promise((resolve, reject) => {
      try {
        window.MINIMASK.account.send(to, amount, token, (r) => resolve(r));
      } catch (e) {
        reject(e);
      }
    });

    $("sendOutput").textContent = JSON.stringify(res, null, 2);
  } catch (e) {
    $("sendOutput").textContent = "Send failed";
  }
}

// ---------- NETWORK ----------
async function getBlock() {
  try {
    await initMiniMask();
    const res = await callMiniMask(window.MINIMASK.meg.block);
    $("networkOutput").textContent = JSON.stringify(res, null, 2);
  } catch (e) {
    $("networkOutput").textContent = "Error";
  }
}

async function getRandom() {
  try {
    await initMiniMask();
    const res = await callMiniMask(window.MINIMASK.meg.random);
    $("networkOutput").textContent = JSON.stringify(res, null, 2);
  } catch (e) {
    $("networkOutput").textContent = "Error";
  }
}

// ---------- TXPOW ----------
async function getTxpow(check = false) {
  const id = $("txpowId").value;

  if (!id) {
    $("txpowOutput").textContent = "Enter TxPoW ID";
    return;
  }

  try {
    await initMiniMask();

    const fn = check
      ? window.MINIMASK.meg.checktxpow
      : window.MINIMASK.meg.gettxpow;

    const res = await new Promise((resolve, reject) => {
      try {
        fn(id, (r) => resolve(r));
      } catch (e) {
        reject(e);
      }
    });

    $("txpowOutput").textContent = JSON.stringify(res, null, 2);
  } catch (e) {
    $("txpowOutput").textContent = "Error";
  }
}

// ---------- EVENTS ----------
$("connectBtn").onclick = connectWallet;
$("refreshBtn").onclick = refreshWallet;
$("payAmount").oninput = calculateSwap;
$("price").oninput = calculateSwap;
$("buyBtn").onclick = () => createOrder("BUY");
$("sellBtn").onclick = () => createOrder("SELL");
$("createOrderBtn").onclick = () => createOrder();
$("sendBtn").onclick = sendPayment;
$("blockBtn").onclick = getBlock;
$("randomBtn").onclick = getRandom;
$("getTxpowBtn").onclick = () => getTxpow(false);
$("checkTxpowBtn").onclick = () => getTxpow(true);

// ---------- INIT ----------
if (isMobile() && !hasMiniMask()) {
  setStatus("Desktop MiniMask required");
} else if (!hasMiniMask()) {
  setStatus("MiniMask not detected");
} else {
  setStatus("MiniMask detected, click connect");
}

calculateSwap();
renderOrders();
renderTrades();
