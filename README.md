# minima-nexus-dex
Production-ready MiniMask powered Minima DEX portal with signed orders, live order book, balances, trading, and P2P chat.** ::contentReference[oaicite:2]{index=2}
# Minima Nexus DEX

A production-focused Minima web portal with MiniMask wallet connection, live balances, signed order placement, order cancellation, order book display, trade history, and P2P trader chat.

## Features

- Modern responsive dark DeFi dashboard
- MiniMask wallet connection
- Connected wallet address display
- Real MiniMask balance reading
- Buy and sell order form
- Live order book through WebSocket relay
- Signed order placement
- Signed order cancellation
- Real MiniMask transaction sending
- Trade status: pending, success, failed
- Trade history panel
- P2P trader message section
- No fake balances
- No simulated swaps
- No dummy transactions

## Install MiniMask

1. Go to https://minimask.org
2. Download the MiniMask extension zip
3. Unzip it
4. Open Chrome
5. Go to `chrome://extensions`
6. Enable Developer Mode
7. Click `Load unpacked`
8. Select the extracted MiniMask folder
9. Allow the extension on your website

## Run Website

Use any static server:

```bash
python3 -m http.server 8080

Then open:
http://localhost:8080

Important Configuration

Open script.js and replace:
ORDER_RELAY_WS: "wss://YOUR_REAL_ORDER_RELAY_SERVER"

with your real backend WebSocket relay.
Replace


quoteTokenId: "PASTE_REAL_USDT_OR_CUSTOM_TOKEN_ID"
settlementAddress: "PASTE_REAL_MINIMA_SETTLEMENT_OR_COUNTERPARTY_ADDRESS"
with real Minima token IDs and a real settlement address.

How DEX Widget Works

The website connects to MiniMask through the global MINIMASK object.

The portal uses:

MINIMASK.account.getAddress() to read the user wallet
MINIMASK.account.balance() to read real balances
MINIMASK.account.sign() to sign order and cancel messages
MINIMASK.account.send() to send real Minima transactions

Orders are not fake. They must be sent to a real WebSocket order relay. The relay should verify signatures, store active orders, broadcast the order book, and remove cancelled or filled orders.

How Users Trade
User installs MiniMask
User opens the website
User connects wallet
User chooses a pair
User creates a buy or sell order
MiniMask signs the order
The order is sent to the real relay
Another user selects the order
MiniMask sends the real transaction
Relay broadcasts trade update
Security Notes
Never store private keys in the website
Never fake balances
Never execute unsigned orders
Verify every order signature server-side
Validate token IDs and settlement addresses
Use HTTPS and WSS only in production
Add rate limits to chat and order relay
Add order expiry timestamps
Add replay protection with nonce values
Display exact transaction details before sending
Audit settlement logic before real public launch
Future Upgrade Ideas
Full backend matcher
Escrow smart contract flow
On-chain settlement verification
Token logo registry
Candlestick chart
Market order support
Limit order expiry
Liquidity pool routing
Mobile-first MiniMask onboarding
Reputation score for P2P traders

Use repo name: **minima-nexus-dex**  
Description: **Production-ready MiniMask powered Minima DEX portal with signed orders, live order book, balances, trading, and P2P chat.**
::contentReference[oaicite:2]{index=2}
