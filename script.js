const CONFIG = {
  ORDER_RELAY_WS: "wss://YOUR_REAL_ORDER_RELAY_SERVER",
  PAIRS: {
    "MINIMA/USDT": {
      baseTokenId: "0x00",
      quoteTokenId: "PASTE_REAL_USDT_OR_CUSTOM_TOKEN_ID",
      settlementAddress: "PASTE_REAL_MINIMA_SETTLEMENT_OR_COUNTERPARTY_ADDRESS"
    }
  }
};

let walletAddress = null;
let selectedOrderId = null;
let socket = null;
let orderBook = [];

const $ = (id) => document.getElementById(id);

function showStatus(message, type = "info") {
  $("txStatus").textContent = message;
  $("txStatus").className = type;
}

function requireMiniMask() {
  if (!window.MINIMASK) {
    throw new Error("MiniMask is not installed or permission is not enabled for this website");
  }
}

function callMiniMask(fn) {
  return new Promise((resolve, reject) => {
    try {
      requireMiniMask();
      fn((resp) => {
        if (!resp) return reject(new Error("MiniMask returned empty response"));
        if (resp.status === false || resp.error) {
          return reject(new Error(resp.error || resp.message || "MiniMask request failed"));
        }
        resolve(resp);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function connectWallet() {
  try {
    requireMiniMask();

    MINIMASK.init((pendingResp) => {
      console.log("MiniMask pending response", pendingResp);
      showStatus("MiniMask transaction response received");
    });

    const addressResp = await callMiniMask((cb) => MINIMASK.account.getAddress(cb));
    walletAddress = addressResp.address || addressResp.response || addressResp.data?.address;

    if (!walletAddress) throw new Error("Could not read MiniMask address");

    $("walletStatus").textContent = "Connected";
    $("walletAddress").textContent = walletAddress;

    await refreshBalances();
    connectOrderRelay();
  } catch (err) {
    $("walletStatus").textContent = "Connection failed";
    showStatus(err.message, "failed");
  }
}

async function refreshBalances() {
  try {
    const balanceResp = await callMiniMask((cb) => MINIMASK.account.balance(cb));
    $("balances").innerHTML = "";

    const balances = balanceResp.balance || balanceResp.response || balanceResp.tokens || [];

    if (Array.isArray(balances)) {
      balances.forEach((token) => {
        const row = document.createElement("p");
        row.textContent = `${token.token || token.tokenid || "TOKEN"}: ${token.amount || token.balance || "0"}`;
        $("balances").appendChild(row);
      });
    } else {
      $("balances").textContent = JSON.stringify(balanceResp, null, 2);
    }
  } catch (err) {
    showStatus(err.message, "failed");
  }
}

function connectOrderRelay() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  socket = new WebSocket(CONFIG.ORDER_RELAY_WS);

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: "JOIN",
      address: walletAddress,
      pair: $("pairSelect").value
    }));
    showStatus("Connected to real order relay");
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "ORDERBOOK") {
      orderBook = msg.orders || [];
      renderOrderBook();
    }

    if (msg.type === "TRADE") {
      addHistory(msg.trade);
    }

    if (msg.type === "CHAT") {
      addChat(msg.address, msg.message);
    }

    if (msg.type === "ERROR") {
      showStatus(msg.message, "failed");
    }
  };

  socket.onerror = () => showStatus("Order relay connection failed", "failed");
  socket.onclose = () => showStatus("Order relay disconnected", "failed");
}

async function placeOrder() {
  try {
    if (!walletAddress) throw new Error("Connect MiniMask first");
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("Order relay is not connected");

    const pair = $("pairSelect").value;
    const side = $("side").value;
    const price = $("price").value;
    const amount = $("amount").value;

    if (!price || Number(price) <= 0) throw new Error("Enter a valid price");
    if (!amount || Number(amount) <= 0) throw new Error("Enter a valid amount");

    const pairConfig = CONFIG.PAIRS[pair];

    const order = {
      type: "PLACE_ORDER",
      id: crypto.randomUUID(),
      pair,
      side,
      price,
      amount,
      trader: walletAddress,
      baseTokenId: pairConfig.baseTokenId,
      quoteTokenId: pairConfig.quoteTokenId,
      createdAt: Date.now()
    };

    const signResp = await callMiniMask((cb) =>
      MINIMASK.account.sign(JSON.stringify(order), false, cb)
    );

    order.signature = signResp.signature || signResp.response || signResp.signed;

    if (!order.signature) {
      throw new Error("MiniMask did not return a valid order signature");
    }

    socket.send(JSON.stringify(order));
    showStatus("Signed order submitted to live relay", "pending");
  } catch (err) {
    showStatus(err.message, "failed");
  }
}

async function cancelSelectedOrder() {
  try {
    if (!selectedOrderId) throw new Error("Select an order first");
    if (!walletAddress) throw new Error("Connect MiniMask first");

    const cancelMsg = {
      type: "CANCEL_ORDER",
      orderId: selectedOrderId,
      trader: walletAddress,
      createdAt: Date.now()
    };

    const signResp = await callMiniMask((cb) =>
      MINIMASK.account.sign(JSON.stringify(cancelMsg), false, cb)
    );

    cancelMsg.signature = signResp.signature || signResp.response || signResp.signed;
    socket.send(JSON.stringify(cancelMsg));

    showStatus("Cancel request signed and sent", "pending");
  } catch (err) {
    showStatus(err.message, "failed");
  }
}

async function executeTrade(order) {
  try {
    const pairConfig = CONFIG.PAIRS[order.pair];
    const tokenToSend = order.side === "SELL" ? pairConfig.quoteTokenId : pairConfig.baseTokenId;
    const amountToSend = order.side === "SELL"
      ? String(Number(order.amount) * Number(order.price))
      : order.amount;

    const state = {
      0: "MINIMA_NEXUS_DEX_TRADE",
      1: order.id,
      2: order.pair,
      3: order.side
    };

    showStatus("Waiting for MiniMask transaction approval", "pending");

    const sendResp = await callMiniMask((cb) =>
      MINIMASK.account.send(
        amountToSend,
        pairConfig.settlementAddress,
        tokenToSend,
        state,
        cb
      )
    );

    socket.send(JSON.stringify({
      type: "EXECUTE_TRADE",
      orderId: order.id,
      taker: walletAddress,
      tx: sendResp,
      createdAt: Date.now()
    }));

    showStatus("Trade transaction sent successfully", "success");
    addHistory({ pair: order.pair, side: order.side, price: order.price, amount: order.amount });
  } catch (err) {
    showStatus(err.message, "failed");
  }
}

function renderOrderBook() {
  $("orderBookBody").innerHTML = "";

  orderBook.forEach((order) => {
    const tr = document.createElement("tr");
    tr.onclick = () => {
      selectedOrderId = order.id;
      showStatus(`Selected order ${order.id}`);
    };

    tr.ondblclick = () => executeTrade(order);

    tr.innerHTML = `
      <td class="${order.side === "BUY" ? "buy" : "sell"}">${order.side}</td>
      <td>${order.price}</td>
      <td>${order.amount}</td>
      <td>${short(order.trader)}</td>
    `;

    $("orderBookBody").appendChild(tr);
  });
}

function addHistory(trade) {
  const div = document.createElement("p");
  div.textContent = `${trade.pair} ${trade.side} ${trade.amount} at ${trade.price}`;
  $("tradeHistory").prepend(div);
}

function addChat(address, message) {
  const p = document.createElement("p");
  p.textContent = `${short(address)}: ${message}`;
  $("chatBox").appendChild(p);
}

function sendChat() {
  const message = $("chatInput").value.trim();
  if (!message || !socket || socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify({
    type: "CHAT",
    address: walletAddress,
    message,
    createdAt: Date.now()
  }));

  $("chatInput").value = "";
}

function short(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

$("connectBtn").onclick = connectWallet;
$("refreshBtn").onclick = refreshBalances;
$("placeOrderBtn").onclick = placeOrder;
$("cancelOrderBtn").onclick = cancelSelectedOrder;
$("sendChatBtn").onclick = sendChat;
