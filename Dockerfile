# =========================
# Builder Stage
# =========================
FROM node:22-slim AS builder

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema first
COPY prisma ./prisma

# Copy source
COPY . .

# Generate Prisma client + build TypeScript
RUN pnpm build



# =========================
# Production Stage
# =========================
FROM node:22-slim AS production

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
# Skip postinstall because Prisma already generated in builder
RUN pnpm install --prod --frozen-lockfile --ignore-scripts


# Copy compiled app
COPY --from=builder /app/dist ./dist

# Copy generated Prisma client
COPY --from=builder /app/src/generated ./src/generated


ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/server.js"]