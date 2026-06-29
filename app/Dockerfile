# ---------- Stage 1: Build ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the app (TypeScript → JS)
RUN npm run build


# ---------- Stage 2: Production ----------
FROM node:20-alpine

WORKDIR /app

# Copy only package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["echo", "Error: specify a command. Use node dist/api/index.js or node dist/worker/index.js"]