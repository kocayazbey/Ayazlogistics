FROM node:22-alpine AS builder

# Install necessary packages for Alpine musl compatibility
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

FROM node:22-alpine AS production

# Install glibc compatibility for Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/database ./database

EXPOSE 3000

CMD ["node", "dist/main.js"]