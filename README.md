# TrackSentinel

> **Marketing Tracking Reliability SaaS**  
> *"Know when your Meta tracking breaks — before it costs you money."*

TrackSentinel is an autonomous, multi-tenant monitoring platform built for performance marketing agencies. It continuously verifies Meta Pixel installations, standard conversion events, and browser-initiated network requests across all client stores and landing pages, instantly alerting your media buyers via Telegram and Email when tracking breaks.

---

## ⚡ Key Capabilities

- **Autonomous Meta Pixel Detection**: Uses isolated Playwright headless Chromium instances to inspect script tags, inline tags, noscript fallbacks, and hooks `window.fbq('init', ...)` in-memory.
- **Network Request Interception**: Sniffs and parses all outgoing HTTP beacons to `facebook.com/tr/` (`id`, `ev`, payloads).
- **Standard Events Monitoring**: Actively checks passive firing of standard events: `PageView`, `ViewContent`, `Lead`, `CompleteRegistration`, `AddToCart`, `InitiateCheckout`, `Purchase`, `Contact`, `Search`.
- **Duplicate Event Detection**: Flags suspected rapid duplicate firing that distorts ad optimization and ROAS.
- **Accurate Incident Lifecycle**: Stable fingerprinting (`sha256(site_id + issue_type + event_name)`). Automatically resolves incidents when tracking recovers and dispatches recovery alerts. No repetitive alert spam.
- **SSRF Hardening**: Custom DNS verification blocks loopback, private RFC1918 ranges, internal ports, and Cloud/Hetzner metadata endpoints (`169.254.169.254`).
- **Telegram & Email Alerts**: Secure cryptographic linking token flow (`/start ts_token`) for Telegram bot + Resend HTML email reports.

---

## 🏗️ Architecture

```
                    ┌─────────────────────────┐
                    │   Browser Clients (UI)  │
                    └────────────┬────────────┘
                                 │ HTTPS (Port 443)
                    ┌────────────▼────────────┐
                    │  Nginx / Reverse Proxy  │
                    └────────────┬────────────┘
                                 │
     ┌───────────────────────────┴───────────────────────────┐
     │ Hetzner Host (Isolated Docker Bridge: tracksentinel)  │
     │                                                       │
     │  ┌───────────────────────┐   ┌─────────────────────┐  │
     │  │   tracksentinel_web   │   │ tracksentinel_worker│  │
     │  │   (Next.js 15 + API)  │   │ (Playwright Engine) │  │
     │  └───────────┬───────────┘   └──────────┬──────────┘  │
     │              │                          │             │
     │              └────────────┬─────────────┘             │
     │                           │ SQL Connection (Port 5432)│
     │              ┌────────────▼────────────┐              │
     │              │  tracksentinel_postgres │              │
     │              │     (PostgreSQL 16)     │              │
     │              └─────────────────────────┘              │
     └───────────────────────────────────────────────────────┘
```

- **Monorepo Structure**:
  - `apps/web`: Next.js 15 (App Router, Tailwind CSS, NextAuth.js v5 credentials, Server Actions & REST API `/api/v1/...`).
  - `packages/db`: Drizzle ORM schemas, PostgreSQL connection pooling, migrations.
  - `packages/worker`: Node.js monitoring daemon, Playwright browser engine, SSRF guards, Telegram/Resend dispatchers.
  - `docker/`: Multi-stage Dockerfiles and Nginx reverse proxy configurations.

---

## 🚀 Local Development

### Prerequisites
- Node.js v20+
- pnpm v10+
- PostgreSQL 14+ running locally (e.g. `brew services start postgresql@14`)

### Setup & Run

1. **Clone & install dependencies**:
   ```bash
   git clone https://github.com/Elmun-Technologies/tracksentinel.git
   cd tracksentinel
   pnpm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   cp .env.example apps/web/.env.local
   # Ensure DATABASE_URL points to your local postgres instance
   ```

3. **Apply database migrations & seed demo agency data**:
   ```bash
   # Apply initial Drizzle migration
   psql -U tracksentinel -d tracksentinel -f packages/db/migrations/0000_brave_smasher.sql

   # Seed sample agency, client websites, and demo user
   cd packages/worker && pnpm exec tsx ../../scripts/seed.ts
   ```

4. **Start Web Application**:
   ```bash
   pnpm --filter web dev
   # Open http://localhost:3000
   # Login with: demo@agency.com / password123
   ```

5. **Start Background Monitoring Worker**:
   ```bash
   pnpm --filter @tracksentinel/worker dev
   ```

---

## 🧪 Testing & Verification

Run the full automated test suite with Vitest:

```bash
pnpm test
```

Includes:
- **SSRF Protection Engine** (Localhost, 127.0.0.1, 10.x, 192.168.x, Cloud metadata 169.254.169.254, internal ports, safe URLs).
- **Zod Schema Validations** (Pixel ID digits, interval constraints, URL checks).
- **Incident Deduplication & Fingerprinting** (Stable hashes, cross-tenant isolation).

Run typechecking across all monorepo packages:
```bash
pnpm typecheck
```

---

## 🚢 Production Deployment (Hetzner Cloud)

### 1. Server Prerequisites
- Ubuntu 22.04 / 24.04 LTS VPS on Hetzner
- Docker Engine & Docker Compose plugin installed
- Domain DNS pointed to your Hetzner VPS IP (e.g. `app.youragency.com`)

### 2. Deployment Instructions

```bash
# Clone to /opt/tracksentinel
git clone https://github.com/Elmun-Technologies/tracksentinel.git /opt/tracksentinel
cd /opt/tracksentinel

# Set up production secrets
cp .env.example /opt/tracksentinel/.env.production
nano /opt/tracksentinel/.env.production

# Build and start services in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# Run initial schema migration
docker exec -i tracksentinel_postgres psql -U tracksentinel -d tracksentinel < packages/db/migrations/0000_brave_smasher.sql

# Configure Nginx reverse proxy
sudo cp docker/nginx-site.conf /etc/nginx/sites-available/tracksentinel
sudo ln -s /etc/nginx/sites-available/tracksentinel /etc/nginx/sites-enabled/
sudo certbot --nginx -d app.youragency.com
sudo systemctl reload nginx
```

### 3. Automated Database Backups
A production backup script is located in `scripts/backup-db.sh`. Schedule it via cron:

```bash
# Add to crontab (daily backup at 03:00 AM)
0 3 * * * /opt/tracksentinel/scripts/backup-db.sh /opt/tracksentinel/backups >> /var/log/tracksentinel-backup.log 2>&1
```

---

## 🔒 Security Best Practices

- **Zero-Public DB**: PostgreSQL port `5432` is bound only to the internal Docker bridge (`tracksentinel_net`) and is never exposed to the public internet.
- **Worker Isolation**: The Playwright container runs with `cap_drop: ALL`, `no-new-privileges: true`, and as an unprivileged user.
- **Anti-SSRF Verification**: Hostnames in client-supplied URLs are resolved via DNS at runtime to prevent DNS-rebinding attacks targeting internal cloud metadata.
- **Privacy Assurance**: TrackSentinel never captures or stores visitor PII, form inputs, full request cookies, or personal customer data.

---

## 📄 License

Proprietary © 2026 Elmun Technologies. All rights reserved.
