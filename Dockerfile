# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Installer les dépendances natives (python3, make, g++)
RUN apk add --no-cache python3 make g++

# Copier package files
COPY package*.json ./
COPY prisma ./prisma/

# Installer toutes les dépendances
RUN npm ci

# 2. Générer le client Prisma
RUN npx prisma generate

# Production stage
FROM node:20-alpine

WORKDIR /app

# Installer les dépendances runtime pour bcrypt et les libs générales d'Alpine
RUN apk add --no-cache libc6-compat

# Copier package files et installer les dépendances de production
COPY package*.json ./
RUN npm ci --only=production

# 3. Copier les engines Prisma générés depuis le builder
# /app/node_modules/.prisma contient les engines spécifiques générés
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copier application source et autres fichiers
COPY . .

# Créer l'utilisateur non-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Changer ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "src/server.js"]