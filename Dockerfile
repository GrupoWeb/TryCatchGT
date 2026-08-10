# ---- Etapa de build: compila TypeScript a dist/ ----
FROM node:20-alpine AS builder
WORKDIR /app

# Instala TODAS las dependencias (incluidas las de dev: typescript) usando la
# caché de capas: primero package*.json, luego el código.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Etapa de runtime: imagen ligera solo con lo necesario ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Solo dependencias de producción.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Código compilado + assets del frontend. El server los sirve desde
# process.cwd()/src/presentation/public, por eso se copia ese árbol tal cual.
COPY --from=builder /app/dist ./dist
COPY src/presentation/public ./src/presentation/public

# La app corre como usuario sin privilegios (no root). Necesita poder escribir en
# public/uploads (upload.ts hace mkdirSync al arrancar), por eso se ajusta la
# propiedad del árbol de la app antes de bajar de privilegios.
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Chequeo de salud: la landing responde 200 cuando el server está arriba.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "dist/infrastructure/http/server.js"]
