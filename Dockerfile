# syntax=docker/dockerfile:1

FROM node:22-slim AS deps
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-slim AS builder
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Baked in at build time: Next.js inlines NEXT_PUBLIC_* vars into the client
# bundle during `next build`, so these must be real values here, not just
# runtime container env vars. They're the public anon key/URL, safe to bake in.
ENV NEXT_PUBLIC_SUPABASE_URL=https://yfbervacehtahbsikniv.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmYmVydmFjZWh0YWhic2lrbml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3ODE1OTAsImV4cCI6MjEwMjM1NzU5MH0.YnRZ73ykAzZ0bRMaHXGitcgxuJJF6g02V-CmO3FYtuQ
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runner
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
# pdfjs-dist (used by pdf-parse) loads its worker script from a file path at
# runtime, not a static import — Next's standalone output tracing misses it,
# same class of gap as Prisma's engine binaries above.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pdf-parse ./node_modules/pdf-parse

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
