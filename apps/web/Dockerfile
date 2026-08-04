# syntax=docker/dockerfile:1
FROM oven/bun:1

WORKDIR /app

# Whole workspace in one copy -- see apps/api/Dockerfile for why this isn't
# a partial, per-package.json layer-cache trick.
COPY . .
RUN bun install --frozen-lockfile

# VITE_* vars are baked into the client bundle at build time by Vite --
# unlike apps/api's env, these cannot be supplied at `docker run` time.
# VITE_SSR_API_BASE_URL should point at the api service's in-network name
# (see docker-compose.yml); VITE_API_BASE_URL is what the *browser* calls,
# so it must be a URL actually reachable from outside the Docker network.
ARG VITE_API_BASE_URL=http://localhost:3001/api/v1
ARG VITE_SSR_API_BASE_URL=http://api:3001/api/v1
ARG VITE_FIREBASE_VAPID_KEY=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SSR_API_BASE_URL=$VITE_SSR_API_BASE_URL
ENV VITE_FIREBASE_VAPID_KEY=$VITE_FIREBASE_VAPID_KEY

WORKDIR /app/apps/web
RUN bun run build

# The SSR server (dist/server/server.js) imports h3/react/etc. as external
# specifiers resolved from node_modules at runtime -- it is not a bundled,
# standalone file, so the full workspace install from above has to ship in
# the final image too, not just dist/.
ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "dist/server/server.js"]
