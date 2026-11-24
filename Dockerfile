# Multi-stage build: install deps, compile TypeScript, then run the compiled app
FROM node:22-alpine AS builder

WORKDIR /app

# Build tools for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@12.23.0 --activate && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Runtime image
FROM node:22-alpine

WORKDIR /app

# better-sqlite3 needs its native build tools at runtime too
RUN apk add --no-cache python3 make g++

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# The database is created at /app/database.db (the app runs from WORKDIR).
# To persist it across restarts, bind-mount the file on the host
# (create it first: touch database.db, then:
#   docker run -v "$PWD/database.db:/app/database.db" musik-notifcation)

CMD ["node", "dist/index.js"]
