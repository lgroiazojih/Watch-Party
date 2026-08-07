FROM node:18-alpine

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

# Install client dependencies and build
RUN cd client && npm install && npm run build

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=./data/watchparty.db
ENV JWT_SECRET=watchparty_super_secret_key_2024_xkcd_horse_battery_staple

CMD ["node", "server/index.js"]
