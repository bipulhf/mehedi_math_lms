# syntax=docker/dockerfile:1

# Debian-based, not the -slim/-alpine variants: apps/api depends on sharp
# and @resvg/resvg-js, both native modules that need glibc.
FROM oven/bun:1

WORKDIR /app

# Whole workspace in one copy rather than a per-package.json layer-cache
# trick -- packages are consumed as TypeScript source, not built output
# (see packages/db/AGENTS.md), and a partial copy risks `--frozen-lockfile`
# rejecting a workspace graph that doesn't match bun.lock exactly (mobile
# included -- see .dockerignore).
COPY . .
RUN bun install --frozen-lockfile

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3001

# Workers (notification/sms/file-processing/audit-log-cleanup) reuse this
# same image with their command overridden in docker-compose.yml, since
# they're just a different entry point over the same installed workspace.
CMD ["bun", "src/index.ts"]
