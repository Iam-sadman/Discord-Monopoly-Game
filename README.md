# Block Party 🎲 — Bangladesh Strategy Board Game

> **"Block Party"** is a real-time multiplayer, Bangladesh-themed real-estate strategy board game (Monopoly-style) designed to run seamlessly inside **Discord as an Embedded Activity** or in any **Modern Web Browser**.

Built with a strictly **server-authoritative** architecture, WebSocket real-time synchronization, a tactile **Neumorphic UI (Light & Dark Mode)**, authentic landmark photo cards, live property upgrades, bank debt mechanics, and multi-room match isolation.

---

## 📋 Table of Contents
1. [Key Features](#-key-features)
2. [Tech Stack & Architecture](#-tech-stack--architecture)
3. [Complete Game Rules & Player Guide](#-complete-game-rules--player-guide)
   - [Board Layout & 40 Bangladesh Landmarks](#board-layout--40-bangladesh-landmarks)
   - [Starting Conditions & Match Timing](#starting-conditions--match-timing)
   - [25-Second Roll Timer & AFK Penalty](#25-second-roll-timer--afk-penalty)
   - [Property Buying & 10s Live Auctions](#property-buying--10s-live-auctions)
   - [Building Upgrades & 25% Construction VAT](#building-upgrades--25-construction-vat)
   - [Rent Calculation & Complete Set Bonus](#rent-calculation--complete-set-bonus)
   - [Mortgaging & Unmortgaging](#mortgaging--unmortgaging)
   - [Bank Loans & Time-Tiered Interest](#bank-loans--time-tiered-interest)
   - [Cyclic Utility Bills](#cyclic-utility-bills)
   - [Jail & Bail Rules](#jail--bail-rules)
   - [Chance & Community Event Cards](#chance--community-event-cards)
   - [Ending the Match & Final Net Worth Scoring](#ending-the-match--final-net-worth-scoring)
4. [Multi-Room Isolated Matches](#-multi-room-isolated-matches)
5. [Local Development Quickstart](#-local-development-quickstart)
6. [VPS Server Production Deployment Guide](#-vps-server-production-deployment-guide)
   - [Method 1: Docker & Docker Compose (Recommended)](#method-1-docker--docker-compose-recommended)
   - [Method 2: Bare-Metal Linux with PM2](#method-2-bare-metal-linux-with-pm2)
   - [Nginx Reverse Proxy & Free SSL Setup](#nginx-reverse-proxy--free-ssl-setup)
   - [Discord Developer Portal & Embedded Activity Setup](#discord-developer-portal--embedded-activity-setup)
7. [Environment Variables Reference](#-environment-variables-reference)
8. [Automated Test Suite](#-automated-test-suite)

---

## ✨ Key Features

- **🇧🇩 40 Authentic Bangladesh Landmarks:** Travel across Old Dhaka Shankhari Bazar, Lalbagh Fort, Dhaka Metro Rail, Kamalapur, Padma Bridge, Sylhet Tea Gardens, Cox's Bazar Sea Beach, and Sajek Valley.
- **🎨 Tactile Neumorphic Design:** Soft dual shadows, inset tactile buttons, glowing owner rings, and one-click Light/Dark theme switching.
- **⚡ Real-Time Server-Authoritative Engine:** All dice rolls, transactions, timers, VAT rounding, and loan interest calculations occur on the backend with zero client-side cheating.
- **⏱️ 25s Roll Countdown & Streak Penalty:** Active players have 25 seconds to roll. Missing rolls incurs a -10 coin penalty per missed streak and auto-rolls to keep the game moving fast.
- **🏦 Realistic Banking & Debt:** Take emergency bank loans (up to 300 coins) with dynamic interest rates that escalate over match duration (1%, 2%, 3%/min).
- **🏗️ Live Property Upgrades & Instant Visual Badges:** Level up properties from empty land (L0) to Luxury Hotels (L4) with live visual badges (`👑 YOU`, `🏠 L1–L3`, `🏨 HOTEL`).
- **🚪 Multi-Room Match System:** Host separate 6-player matches simultaneously with custom or random Bangladesh-themed room codes (`dhaka-arena`, `padma-clash`, `coxs-bazaar`).
- **🛑 Mid-Game Match Termination:** Host or players can safely conclude a match early to compute final Net Worth rankings and trigger rematches.

---

## 🛠️ Tech Stack & Architecture

The project is built as a **Modular Monolith** using `npm workspaces`:

```
Discord-Monopoly-Game/
├── shared/         # Universal TypeScript types, game constants, board tiles, socket contracts
├── server/         # Node.js + Express + Socket.IO + PostgreSQL (with in-memory dev DB)
└── client/         # React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion
```

- **Runtime:** Node.js 20+ (ES Modules)
- **Database:** PostgreSQL 16 (or automatic transactional In-Memory DB for zero-config local runs)
- **Networking:** WebSockets via Socket.IO v4 with isolated room namespaces (`game_<gameId>`)
- **Testing:** Vitest test suite validating financial calculations, VAT rounding, and tie-breakers

---

## 🎲 Complete Game Rules & Player Guide

All financial transactions use whole integer coins (no floating-point values).

### Board Layout & 40 Bangladesh Landmarks

The board consists of 40 tiles arranged in a continuous perimeter loop:

| Index | Tile Name | Type | Category | Price | Base Rent |
| :---: | :--- | :--- | :--- | :---: | :---: |
| **0** | **Start / Payday** | START | — | — | +200 coins |
| 1 | Shankhari Bazar | PROPERTY | Old Dhaka (Brown) | 100c | 10c |
| 2 | Community Event | EVENT | — | — | Card Draw |
| 3 | Lalbagh Fort | PROPERTY | Old Dhaka (Brown) | 120c | 12c |
| 4 | Income Tax | TAX | — | — | -150 coins |
| 5 | DESCO Power Grid | UTILITY | Utility Set | 150c | 20c / 45c / 80c |
| 6 | Mohammadpur | PROPERTY | Dhaka West (Sky Blue) | 140c | 14c |
| 7 | Chance | CHANCE | — | — | Card Draw |
| 8 | Mirpur Stadium | PROPERTY | Dhaka West (Sky Blue) | 150c | 15c |
| 9 | Uttara Suburb | PROPERTY | Dhaka West (Sky Blue) | 160c | 16c |
| **10** | **Central Jail / Just Visiting** | JAIL | — | — | Visiting / In Jail |
| 11 | New Market | PROPERTY | Commercial Hub (Pink) | 180c | 18c |
| 12 | WASA Water Reservoir | UTILITY | Utility Set | 150c | 20c / 45c / 80c |
| 13 | Dhanmondi Lake | PROPERTY | Commercial Hub (Pink) | 190c | 19c |
| 14 | Farmgate | PROPERTY | Commercial Hub (Pink) | 200c | 20c |
| 15 | Kamalapur Railway | TRANSIT | Transit Set | 200c | 25c / 50c / 100c |
| 16 | Motijheel C/A | PROPERTY | Financial District (Orange) | 220c | 22c |
| 17 | Community Event | EVENT | — | — | Card Draw |
| 18 | Banani Avenues | PROPERTY | Financial District (Orange) | 230c | 23c |
| 19 | Gulshan Circle | PROPERTY | Financial District (Orange) | 250c | 25c |
| **20** | **Free Parking** | PARKING | — | — | Safe Rest Stop |
| 21 | Bashundhara R/A | PROPERTY | Diplomatic Zone (Red) | 270c | 27c |
| 22 | Chance | CHANCE | — | — | Card Draw |
| 23 | Baridhara Diplomatic | PROPERTY | Diplomatic Zone (Red) | 280c | 28c |
| 24 | Gulshan Avenue | PROPERTY | Diplomatic Zone (Red) | 300c | 30c |
| 25 | Dhaka Metro Rail | TRANSIT | Transit Set | 200c | 25c / 50c / 100c |
| 26 | Purbachal City | PROPERTY | Mega Projects (Yellow) | 320c | 32c |
| 27 | WASA Water Supply | UTILITY | Utility Set | 150c | 20c / 45c / 80c |
| 28 | Chattogram Agrabad | PROPERTY | Mega Projects (Yellow) | 340c | 34c |
| 29 | Chattogram GEC Circle | PROPERTY | Mega Projects (Yellow) | 360c | 36c |
| **30** | **Go to Jail** | GO_TO_JAIL | — | — | Sent to Jail |
| 31 | Cox's Bazar Sea Beach | PROPERTY | Tourism & Heritage (Green) | 400c | 40c |
| 32 | Community Event | EVENT | — | — | Card Draw |
| 33 | Sylhet Zindabazar | PROPERTY | Tourism & Heritage (Green) | 420c | 42c |
| 34 | NBR Tax Audit | TAX | — | — | -200 coins |
| 35 | Shahjalal Int'l Airport | TRANSIT | Transit Set | 200c | 25c / 50c / 100c |
| 36 | Chance | CHANCE | — | — | Card Draw |
| 37 | Hatirjheel Promenade | PROPERTY | Grand Luxury (Indigo) | 460c | 46c |
| 38 | Electricity Bill | BILL | — | — | -100 coins |
| 39 | Sajek Valley | PROPERTY | Grand Luxury (Indigo) | 500c | 50c |

---

### Starting Conditions & Match Timing
- **Players:** 2 to 6 players per match room.
- **Starting Cash:** **1,500 coins** per player.
- **Match Duration:** 30 minutes total. At 30:00, all active actions freeze and final scoring runs.
- **Payday:** Passing or landing on Index 0 awards **+200 coins**.

---

### 25-Second Roll Timer & AFK Penalty
- When your turn starts, a **25-second countdown timer** appears in the center dashboard.
- If you roll within 25 seconds, your roll streak is healthy.
- **AFK Penalty:** If the timer reaches 0 without rolling:
  - Your missed streak counter increments (`streak += 1`).
  - You are penalized `streak * 10` coins (10 coins on 1st miss, 20 coins on 2nd miss, 30 coins on 3rd miss, etc.).
  - The server automatically rolls the dice on your behalf so other players are never blocked.

---

### Property Buying & 10s Live Auctions
- When landing on an unowned property, you can **Buy** at the printed purchase price.
- If you **Decline** or your decision timer expires, a **10-Second Live Auction** starts for all active players:
  - **Starting Bid:** 50% of the property's purchase price (`Math.floor(price * 0.50)`).
  - **Minimum Increment:** 10 coins.
  - The highest bidder when the timer reaches 0 wins the property.

---

### Building Upgrades & 25% Construction VAT
Properties can be upgraded from empty land up to a luxury hotel:

| Level | Structure | Rent Multiplier | Base Upgrade Cost | Cost on Incomplete Set (+25% VAT) |
| :---: | :--- | :---: | :---: | :---: |
| **L0** | Empty Land | 1x | — | — |
| **L1** | Small House | 2x | 100c | **125c** (100 + 25) |
| **L2** | Apartment / Office | 3x | 150c | **188c** (150 + 38) |
| **L3** | High-Rise Tower | 4x | 250c | **313c** (250 + 63) |
| **L4** | Luxury Hotel | 6x | 350c | **438c** (350 + 88) |

- **Incomplete Set VAT (25%):** You do NOT need a complete category set to build. However, building on an incomplete set incurs a **25% government construction VAT** (`Math.ceil(cost * 0.25)`).
- **Complete Set:** Owning all properties in a category waives the 25% VAT (0% VAT) and unlocks the set rent multiplier.

---

### Rent Calculation & Complete Set Bonus
When an opponent lands on your property, they pay rent:
$$\text{Rent} = \lfloor \text{Base Rent} \times \text{Building Level Multiplier} \times \text{Set Multiplier} \rfloor$$

- **Complete Set Multiplier:** `1.25x` bonus rent if you own all properties in that category and none of them are mortgaged.
- **Transit Tiles:** Rent scales with the number of transit hubs owned: 1 owned = 25c, 2 owned = 50c, 3 owned = 100c.
- **Utility Tiles:** Rent scales with utilities owned: 1 owned = 20c, 2 owned = 45c, 3 owned = 80c.
- **Mortgaged Properties:** Collect **0 rent**.

---

### Mortgaging & Unmortgaging
- Only empty land (**Level 0**) can be mortgaged.
- **Mortgage Value:** Receive 50% of the property purchase price (`Math.floor(price * 0.50)`).
- **Unmortgage Cost:** Pay back the 50% principal plus a 5% bank handling fee (`Math.ceil(price * 0.55)`).

---

### Bank Loans & Time-Tiered Interest
Players can access the Bank Drawer at any time to take an emergency cash loan:
- **Maximum Active Loan:** 1 loan per player.
- **Loan Cap:** Maximum principal of **300 coins**.
- **Time-Tiered Simple Interest:**
  - Minutes `0:00 – 9:59`: **1% per minute**
  - Minutes `10:00 – 19:59`: **2% per minute**
  - Minutes `20:00 – 30:00`: **3% per minute**
- **Repayment:** Payments deduct interest first, then principal. Paying the full balance completely clears the debt.

---

### Cyclic Utility Bills
Every 3 turns taken by a player (`turnsTaken % 3 === 0`), automated utility bills are charged based on their total developed building levels across the board:
- Electricity: `10 coins` per building level
- Water: `5 coins` per building level
- Total: `15 coins` per building level.

---

### Jail & Bail Rules
- **Entering Jail:** Landing on Index 30 ("Go to Jail") sends you directly to Central Jail (Index 10).
- **While in Jail:**
  - You can still collect rent and manage properties.
  - On your turn, you can either **Pay a 100-coin bail fine** to roll immediately, or choose to **Skip 1 turn**.
  - After skipping 1 turn, you are released for free on your next turn.

---

### Chance & Community Event Cards
Landing on Chance or Community Event triggers an interactive card reveal modal:
- **Reward Cards:** National Heritage Grants (+150c), Cricket Victory Bonus (+200c), Tech Startup Dividend (+120c).
- **Fine Cards:** Speeding on Dhaka Elevated Expressway (-80c), Environmental Tax (-100c).
- **Movement Cards:** Fast transit to Sajek Valley, Cox's Bazar, or Advance to Start (+200c).

---

### Ending the Match & Final Net Worth Scoring
A match ends when the 30-minute timer expires OR when any player/host clicks **"End Match"** in the top HUD and confirms.

Final standings are determined strictly by **Net Worth**:
$$\text{Net Worth} = \text{Cash} + \text{Land Value} + \text{Building Value} - \text{Loan Principal} - \text{Accrued Interest} - \text{Unpaid Bills} - \text{Mortgage Liabilities}$$

- **Land Value:** 100% of property purchase price.
- **Building Value:** 70% of base construction spent (`Math.floor(baseSpent * 0.70)`, excluding VAT).
- **Mortgage Liabilities:** `Math.ceil(price * 0.55)` deducted for each mortgaged property.
- **Tie-Breaker:** 1. Highest Net Worth $\rightarrow$ 2. Highest Cash $\rightarrow$ 3. Lowest Debt $\rightarrow$ 4. Shared Victory.

---

## 🚪 Multi-Room Isolated Matches

Block Party is architected for **Multi-Tenancy**:
- Multiple independent groups of 2–6 players can play simultaneously on the same server.
- Each room has its own game state, board, dice rolls, transactions, and timers.
- **Room Code Features:**
  - **Active Room Code:** Displayed prominently in the lobby and in-game HUD.
  - **Copy Invite Link:** Copies a direct link for friends (`http://your-server/?gameId=dhaka-arena`).
  - **Create New Room:** Input a custom name (e.g. `ctg-clash`) or click **"🎲 Random Name"** to generate authentic Bangladesh room codes.
  - **Join Room Code:** Enter a friend's room code to switch rooms instantly.

---

## 💻 Local Development Quickstart

You can test full real-time multiplayer locally in web browsers without needing Discord credentials:

### 1. Clone & Install
```bash
git clone https://github.com/Iam-sadman/Discord-Monopoly-Game.git
cd Discord-Monopoly-Game
npm install
```

### 2. Compile All Workspaces
```bash
npm run build
```

### 3. Run Automated Tests
```bash
npm test
```
All 37 unit tests will execute and verify financial math, VAT calculations, and game mechanics.

### 4. Start Development Servers
```bash
# Terminal 1: Backend API & Socket Server (Port 3001)
npm run dev:server

# Terminal 2: Vite React Frontend (Port 3000)
npm run dev:client
```

### 5. Multi-Tab Testing
Open two browser tabs:
- **Tab 1 (Host - Shakib):** `http://localhost:3000/?mockUser=user1`
- **Tab 2 (Player 2 - Tamim):** `http://localhost:3000/?mockUser=user2`

Click **"I'm Ready!"** in Tab 2, then click **"Start Match"** in Tab 1 to play!

---

## 🌐 VPS Server Production Deployment Guide

You can deploy Block Party on any Linux VPS (Ubuntu 22.04 / 24.04 LTS, Debian, CentOS) hosted on DigitalOcean, Hetzner, AWS, Linode, or Contabo.

### Method 1: Docker & Docker Compose (Recommended)

Docker packages Node.js, the built client assets, and PostgreSQL into isolated, self-healing containers.

#### 1. Install Docker & Docker Compose on your VPS
```bash
# Update and install Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

#### 2. Clone Repository & Setup Environment
```bash
git clone https://github.com/Iam-sadman/Discord-Monopoly-Game.git
cd Discord-Monopoly-Game

# Create your production environment file
cp .env.example .env
nano .env
```

Ensure your `.env` contains:
```env
PORT=3001
NODE_ENV=production
JWT_SECRET=generate-a-random-secure-string-here-32chars
DATABASE_URL=postgres://blockparty:blockpartypass@postgres:5432/blockparty_db
ALLOW_DEV_AUTH=true
```

#### 3. Launch with Docker Compose
```bash
docker compose up -d --build
```

#### 4. Useful Docker Commands
```bash
# View live server logs
docker compose logs -f server

# Restart containers
docker compose restart

# Stop the game server
docker compose down
```

---

### Method 2: Bare-Metal Linux with PM2

If you prefer running directly on Node.js without Docker:

#### 1. Install Node.js 20+ & PM2
```bash
# Install Node.js 20 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# Install PM2 process manager globally
sudo npm install -g pm2
```

#### 2. Clone Repository & Build
```bash
git clone https://github.com/Iam-sadman/Discord-Monopoly-Game.git
cd Discord-Monopoly-Game

# Install dependencies and build shared, server, and client
npm install
npm run build
```

#### 3. Configure `.env`
```bash
cp .env.example .env
nano .env
```
*(If you do not specify a `DATABASE_URL`, the server will automatically use its built-in transactional In-Memory database, meaning zero database setup required!)*

#### 4. Start with PM2
```bash
# Start the production server
pm2 start npm --name "block-party" -- start

# Configure PM2 to restart automatically on VPS reboot
pm2 startup
pm2 save
```

#### 5. Useful PM2 Commands
```bash
# Check status
pm2 status

# Monitor CPU/RAM and logs
pm2 monit

# View live logs
pm2 logs block-party

# Restart application
pm2 restart block-party
```

---

### Nginx Reverse Proxy & Free SSL Setup

To serve the game over standard HTTPS (Port 443) with your custom domain (e.g. `game.yourdomain.com`), configure Nginx with WebSocket support.

#### 1. Install Nginx & Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

#### 2. Create Nginx Configuration
Create `/etc/nginx/sites-available/block-party`:
```bash
sudo nano /etc/nginx/sites-available/block-party
```

Paste the following configuration:
```nginx
server {
    server_name game.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        
        # Essential WebSocket headers for Socket.IO
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        
        # Real client IP forwarding
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeout configurations
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

#### 3. Enable Site & Obtain Free SSL Certificate
```bash
# Enable configuration
sudo ln -s /etc/nginx/sites-available/block-party /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain free Let's Encrypt SSL certificate
sudo certbot --nginx -d game.yourdomain.com
```

Now your game is live and secure at `https://game.yourdomain.com`!

---

### Discord Developer Portal & Embedded Activity Setup

To run Block Party inside Discord voice channels:

1. **Create Discord App:**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications).
   - Click **"New Application"** and name it **"Block Party"**.
2. **Retrieve Credentials:**
   - Under **General Information**, copy your **Application ID (Client ID)**.
   - Under **OAuth2**, copy your **Client Secret**.
3. **Configure Redirects:**
   - In **OAuth2 $\rightarrow$ Redirects**, add:
     ```
     https://game.yourdomain.com/api/auth/discord
     ```
4. **Configure Embedded Activity URL Mappings:**
   - Under **Activities $\rightarrow$ URL Mappings**, map your root prefix `/` to your domain `game.yourdomain.com`.
5. **Update `.env` on your VPS:**
   ```env
   DISCORD_CLIENT_ID=your_application_id_here
   DISCORD_CLIENT_SECRET=your_client_secret_here
   DISCORD_REDIRECT_URI=https://game.yourdomain.com/api/auth/discord
   ALLOW_DEV_AUTH=false
   ```
6. **Restart your server:**
   ```bash
   pm2 restart block-party
   # or for Docker:
   docker compose restart server
   ```
7. Launch any Discord Voice Channel, click the **Rocket Icon (Activities)**, select **Block Party**, and invite your friends to play!

---

## ⚙️ Environment Variables Reference

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | HTTP and WebSocket port to bind. |
| `NODE_ENV` | `production` | Node environment (`development` or `production`). |
| `JWT_SECRET` | Required | Secure random key used to sign session JWTs. |
| `DATABASE_URL` | Optional | PostgreSQL connection string. If omitted, uses local transactional In-Memory DB. |
| `DISCORD_CLIENT_ID` | Optional | Discord Application Client ID for OAuth2. |
| `DISCORD_CLIENT_SECRET` | Optional | Discord Application Client Secret for OAuth2. |
| `DISCORD_REDIRECT_URI` | Optional | OAuth2 redirect callback URL. |
| `ALLOW_DEV_AUTH` | `true` | Allows web browser mock player testing without Discord credentials. |

---

## 🧪 Automated Test Suite

Run the full Vitest suite to verify game mechanics, economic balancing, and rules:
```bash
npm test
```

### What is tested:
- `economyEngine.test.ts`: Rent calculation, VAT rounding for incomplete sets, and 1.25x complete set multiplier.
- `bankEngine.test.ts`: Time-tiered simple interest (1%, 2%, 3%/min), debt repayment order, and full debt clearance.
- `propertyEngine.test.ts`: Mortgage proceeds, unmortgage liabilities, and building level restrictions.
- `scoringEngine.test.ts`: Final Net Worth calculations, asset depreciations, and 4-step tie-breaker resolution.
- `boardEngine.test.ts`: Perimeter wrap-around indexing, payday awards, and jail placement.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
