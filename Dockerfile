FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY server/ ./server/
COPY client/ ./client/

RUN npm install
RUN cd server && npm install
RUN cd client && npm install && npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Static export outputs to client/out/
COPY --from=builder /app/client/out ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server/index.js"]
