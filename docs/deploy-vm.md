# Deploying to a VM

Two paths: **Docker** (the `docker-compose.yml` at repo root already runs the
whole stack — Postgres, Redis, the API, the web app, and all four background
workers) or **without Docker** (Bun and Postgres installed directly on the
VM, each process supervised by systemd). Both end up serving the same thing
on the same two ports (`3000` web, `3001` API) behind the same reverse proxy.

Pick Docker unless there's a specific reason not to (no root/Docker access on
the VM, an existing bare-metal ops setup, wanting one less moving part). It
needs less manual setup and matches what's already documented and tested in
the README's "Running with Docker" section — this doc's Docker path is the
production-hardening layer on top of that (TLS, reboot survival, backups),
not a replacement for it.

Read the README's "Running with Docker" section first regardless of which
path you take — it documents every environment variable, the Redis-optional
mode, and the web app's `/api/v1` reverse-proxy behavior (`apps/web/server.ts`)
that both paths below depend on.

---

## 1. Provision the VM

Either path assumes:

- A fresh Ubuntu/Debian VM (these instructions use `apt`; adjust for another
  distro) with at least 2 vCPU / 4GB RAM — `sharp` and `@resvg/resvg-js`
  (native image/PDF work in `apps/api`) are not free.
- A domain (or subdomain) with an A/AAAA record pointing at the VM's public
  IP, for TLS. Both paths terminate TLS at a reverse proxy in front of the
  **web** app only — the API is never exposed publicly (`apps/web/server.ts`
  proxies `/api/v1` and `/api/health` to it internally, which is also why
  only `CORS_ORIGINS` needs the web origin, not the API's).
- A non-root user with `sudo` to do the setup, and (for the non-Docker path)
  a dedicated unprivileged system user to actually run the app.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw

# Only what's actually exposed: SSH and the reverse proxy's ports.
# Postgres/Redis/the app's own ports (3000/3001) stay off the public
# interface in both paths below — the proxy is the only public listener.
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 2. Path A — Docker

### 2.1 Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
# Log out and back in for the group change to apply.
```

### 2.2 Get the code and configure `.env`

```bash
sudo mkdir -p /opt/mehedi-math-academy
sudo chown "$USER":"$USER" /opt/mehedi-math-academy
git clone https://github.com/bipulhf/mehedi_math_lms.git /opt/mehedi-math-academy
cd /opt/mehedi-math-academy
cp .env.docker.example .env
```

Fill in `.env` for real:

- `APP_URL` / `BETTER_AUTH_URL` → the real public HTTPS origin (the web
  app's, not the API's — Better Auth's HTTP handler is mounted in
  `apps/web`).
- `VITE_API_BASE_URL` → the public HTTPS origin plus `/api/v1`. This is
  baked into the browser bundle at **build** time, so getting it wrong means
  rebuilding, not just restarting (see 2.4).
- `BETTER_AUTH_SECRET` → generate one (`openssl rand -base64 32` works),
  never reuse the example value.
- `POSTGRES_PASSWORD` → change from the `postgres`/`postgres` default.
- Either `STORAGE_PROVIDER=s3` with real `AWS_*` credentials or
  `STORAGE_PROVIDER=uploadthing` with a real `UPLOADTHING_TOKEN` — the API
  container refuses to start without one, by design (`apps/api/src/lib/env.ts`).
- `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` if Google sign-in is needed;
  leaving them as `replace-me` just disables that provider, it doesn't
  break startup.
- Everything else (SMTP, SMS, Redis tuning) is feature-gated and safe to
  leave as `replace-me` until that integration is actually needed — see
  the README's env section for which.

**Never commit this `.env` or run `docker compose config`/`up`/`run` with
`-v` against it in a way that could leak it into shared logs** — it holds
every production secret.

### 2.3 TLS / reverse proxy

Caddy gets automatic HTTPS (Let's Encrypt) with a four-line config, which is
why it's the default recommendation here over nginx+certbot:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
example.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

That's the whole proxy — `apps/web/server.ts` already handles everything
else (static assets, SSR, the `/api/v1` proxy, WebSocket upgrades for
realtime messaging).

### 2.4 Build and start

```bash
cd /opt/mehedi-math-academy
docker compose up --build -d
```

This builds the images, starts Postgres and (if `COMPOSE_PROFILES=redis`,
the default) Redis, waits for Postgres to be healthy, runs migrations, runs
the idempotent admin bootstrap from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, then
starts the API, the web app, and the four workers. Check it:

```bash
docker compose ps
curl -s http://localhost:3001/api/health | head -c 300
```

### 2.5 Survive a reboot

Docker's own daemon restarts on boot and every service in
`docker-compose.yml` is `restart: unless-stopped`, which is normally enough
— containers come back up when the daemon does. If a systemd unit that
explicitly runs `docker compose up -d` on boot is still wanted (for a health
check before/after, or to tie it to `network-online.target`):

`/etc/systemd/system/mehedi-academy.service`:

```ini
[Unit]
Description=Mehedi's Math Academy (Docker Compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/mehedi-math-academy
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now mehedi-academy.service
```

### 2.6 Redeploying an update

```bash
cd /opt/mehedi-math-academy
git pull
docker compose up --build -d
```

`--build` is only strictly required when a `Dockerfile`, `bun.lock`, or a
`VITE_*` variable changed (those are baked into images at build time) — but
running it every time is harmless and simplest to just always do. Migrations
run automatically on every `up` via the `migrate` one-shot service, which is
safe to re-run (drizzle only applies pending migrations).

### 2.7 Backups

```bash
# Postgres, logical dump — portable across Postgres versions, restorable
# with psql.
docker compose exec postgres pg_dump -U postgres mehedis_math_academy | gzip > "backup-$(date +%F).sql.gz"
```

Automate with a cron entry and ship the file off the VM (object storage,
another host) — a backup that lives only on the VM it's backing up doesn't
survive the VM dying. `docker compose down -v` deletes the `postgres-data`
volume entirely; never run it on a VM without a fresh backup first.

---

## 3. Path B — Without Docker

### 3.1 Create the deploy user

```bash
sudo useradd -m -s /bin/bash deploy
sudo mkdir -p /opt/mehedi-math-academy
sudo chown deploy:deploy /opt/mehedi-math-academy
```

Everything from here runs as `deploy` (`sudo -iu deploy`) unless noted.

### 3.2 Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
# Installs to ~/.bun/bin/bun — i.e. /home/deploy/.bun/bin/bun. systemd
# units below reference this absolute path directly rather than relying on
# PATH, since a systemd service doesn't source .bashrc.
```

Pin to the version this repo expects — `bun --version` should match
`packageManager` in the root `package.json` (currently `1.3.11`); use
`bun upgrade --version 1.3.11` if a newer one installed.

### 3.3 Install Postgres (and Redis, optional)

```bash
sudo apt install -y postgresql redis-server
sudo -u postgres psql -c "CREATE USER mma WITH PASSWORD 'change-me';"
sudo -u postgres psql -c "CREATE DATABASE mehedis_math_academy OWNER mma;"
```

Redis is optional — the whole product runs on Postgres alone with
`REDIS_ENABLED=false` (caches always miss, background jobs run inline in the
API process instead of a worker, and **only one API process is supported**
since realtime delivery is local to whichever process holds the socket — see
`docs/adr/0015-redis-is-optional.md`). Skip `redis-server` and the four
worker units in 3.7 if going this route; there's nothing else to change.

Both Postgres and Redis should listen on `localhost` only (the Ubuntu
package default) — nothing outside this VM needs to reach either directly.

### 3.4 Get the code and configure `.env`

```bash
sudo -iu deploy
git clone https://github.com/bipulhf/mehedi_math_lms.git /opt/mehedi-math-academy
cd /opt/mehedi-math-academy
cp .env.example .env
```

Same fields as the Docker path's `.env.docker.example` (2.2), with real
`localhost` URLs instead of Docker service names — `.env.example` already
has the right hostnames for this path (`DATABASE_URL` pointing at
`localhost:5432`, etc.), it's the Docker file that overrides them. Set
`DATABASE_URL` to match the role/password from 3.3.

### 3.5 Install, build, migrate, seed

```bash
cd /opt/mehedi-math-academy
bun install --frozen-lockfile
bun run build          # turbo build — packages, then apps, in dependency order
bun run db:migrate      # turbo-fanned to packages/db's drizzle-kit migrate
bun run db:seed         # idempotent admin bootstrap from ADMIN_EMAIL/ADMIN_PASSWORD
```

`bun run build` builds `apps/web`'s `dist/client`+`dist/server` (needed —
`apps/web/server.ts` is what actually runs, and it serves those build
outputs) and typechecks/compiles the rest. `apps/api` runs from source
(`bun src/index.ts`) regardless — its own `build` script only exists for
`tsc`'s type-checking, Bun doesn't need a separate compile step to run it.

### 3.6 TLS / reverse proxy

Identical to the Docker path — see 2.3. Caddy proxies to `localhost:3000`
either way; it doesn't know or care whether what's listening there is a
container or a bare process.

### 3.7 systemd units

One shared env file, referenced by every unit below:

`EnvironmentFile=/opt/mehedi-math-academy/.env`

**`/etc/systemd/system/mma-api.service`**

```ini
[Unit]
Description=Mehedi's Math Academy — API
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/mehedi-math-academy/apps/api
EnvironmentFile=/opt/mehedi-math-academy/.env
ExecStart=/home/deploy/.bun/bin/bun src/index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**`/etc/systemd/system/mma-web.service`**

```ini
[Unit]
Description=Mehedi's Math Academy — Web
After=network.target mma-api.service
Requires=mma-api.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/mehedi-math-academy/apps/web
EnvironmentFile=/opt/mehedi-math-academy/.env
Environment=API_PROXY_TARGET=http://localhost:3001
ExecStart=/home/deploy/.bun/bin/bun server.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Four more, only if Redis is enabled (3.3) — same shape, only
`Description`/`ExecStart` differ, all running from `apps/api` since the
workers are just a different entry point over the same installed workspace
(mirroring `docker-compose.yml`'s `worker-*` services, which reuse the API
image for exactly this reason):

| Unit file | `ExecStart` |
|---|---|
| `mma-worker-notification.service` | `.../bun src/workers/notification-worker.ts` |
| `mma-worker-sms.service` | `.../bun src/workers/sms-worker.ts` |
| `mma-worker-file-processing.service` | `.../bun src/workers/file-processing-worker.ts` |
| `mma-worker-audit-log-cleanup.service` | `.../bun src/workers/audit-log-cleanup-worker.ts` |

(`.../bun` = `/home/deploy/.bun/bin/bun`; `WorkingDirectory` =
`/opt/mehedi-math-academy/apps/api` for all four, same `User`/
`EnvironmentFile`/`Restart` lines as `mma-api.service` above.)

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mma-api.service mma-web.service
# and the four worker units, if using Redis
sudo systemctl status mma-api.service
curl -s http://localhost:3001/api/health | head -c 300
```

### 3.8 Redeploying an update

```bash
sudo -iu deploy
cd /opt/mehedi-math-academy
git pull
bun install --frozen-lockfile
bun run build
bun run db:migrate
exit
sudo systemctl restart mma-api.service mma-web.service
# and the four worker units, if running them
```

### 3.9 Backups

```bash
sudo -u postgres pg_dump mehedis_math_academy | gzip > "backup-$(date +%F).sql.gz"
```

Same rule as the Docker path: automate it, ship the file somewhere other
than this VM, and never treat a backup that only exists locally as a real
backup.

---

## 4. Verifying either path worked

- `GET /api/health` (proxied through the web origin, or directly against
  the API on port 3001 from the VM itself) reports which mode a running
  deployment is in — Redis-backed or Postgres-only — per
  `docs/adr/0015-redis-is-optional.md`. Confirm it matches what was
  actually configured.
- Load the site over HTTPS and sign in — this exercises Postgres, the auth
  flow (`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`), and, if Google sign-in is
  configured, the OAuth round trip.
- If Redis is enabled, confirm the four workers are actually running
  (`docker compose ps` / `systemctl status mma-worker-*`) — a background
  job (an SMS batch, a push notification, video-metadata backfill) silently
  queues forever if the worker consuming it isn't up.

## 5. Troubleshooting

- **API refuses to start**: almost always `STORAGE_PROVIDER` set to `s3`
  or `uploadthing` without matching real credentials — the API validates
  this at startup on purpose rather than failing later on the first
  upload (`apps/api/src/lib/env.ts`).
- **Sign-in redirects to the wrong host, or a cookie never sticks**:
  `BETTER_AUTH_URL` isn't the real public web origin, or `CORS_ORIGINS`
  is missing an origin the browser is actually calling from (only needed
  if `VITE_API_BASE_URL` is an absolute URL the browser calls directly,
  bypassing `apps/web/server.ts`'s proxy).
- **Static assets 404, only the HTML loads**: something is running
  `apps/web`'s built `dist/server/server.js` directly instead of
  `server.ts` — the built SSR handler alone only renders pages, it does
  not serve `dist/client`. Both paths above already run `server.ts`; this
  is only a risk if that command gets "simplified" later.
- **A change to `VITE_API_BASE_URL` (or any other `VITE_*` var) had no
  effect after a restart**: those are baked into the browser bundle at
  build time. Docker path needs `--build`; non-Docker path needs
  `bun run build` again, in `apps/web`.
