FROM node:18-alpine AS builder

WORKDIR /app

# Copy root package.json
COPY package.json ./

# Copy server
COPY server/ ./server/

# Copy client
COPY client/ ./client/

# Install root dependencies
RUN npm install

# Install server dependencies
RUN cd server && npm install

# Install client dependencies and build (static export)
RUN cd client && npm install && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built static files from client/out (static export)
COPY --from=builder /app/client/out ./public

# Copy server
COPY --from=builder /app/server ./server

# Copy root package.json
COPY --from=builder /app/package.json ./

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server/index.js"]
