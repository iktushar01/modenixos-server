# =========================
# Builder Stage
# =========================
FROM node:22-slim AS builder

WORKDIR /app

RUN corepack enable

RUN pnpm config set registry https://registry.npmjs.org/

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Copy Prisma schema before install
# because postinstall runs prisma generate
COPY prisma ./prisma

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy application source
COPY . .

# Build TypeScript + generate Prisma client
RUN pnpm build



# =========================
# Production Stage
# =========================
FROM node:22-slim AS production

WORKDIR /app

RUN corepack enable

RUN pnpm config set registry https://registry.npmjs.org/

COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
# Disable postinstall because Prisma CLI is devDependency
RUN pnpm install --prod --frozen-lockfile --ignore-scripts


# Copy compiled application
COPY --from=builder /app/dist ./dist

# Copy generated Prisma client
COPY --from=builder /app/src/generated ./src/generated

# Copy Prisma folder (migration/schema)
COPY prisma ./prisma


ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "dist/server.js"]