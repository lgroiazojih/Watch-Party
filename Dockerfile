FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY server/ ./server/
COPY client/ ./client/

# Install all dependencies at root level
RUN npm install

# Build the Next.js client
RUN cd client && npm run build

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
