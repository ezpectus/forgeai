FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The API (api/main.ts via tsx) is a second process in the same container, so
# it needs the full dependency install plus the sources it reads at runtime
# (template configs, gallery index, prompt builders under src/).
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/api ./api
COPY --from=builder /app/src ./src
COPY --from=builder /app/configs ./configs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
EXPOSE 3001
ENV PORT=3000
ENV API_PORT=3001
ENV HOSTNAME="0.0.0.0"

# Run the Hono API and the Next standalone server side by side. The Next
# server rewrites /api/* to http://localhost:3001 by default — both processes
# share the container's loopback, so no extra wiring is needed.
CMD ["sh", "-c", "npx tsx api/main.ts & node server.js"]
