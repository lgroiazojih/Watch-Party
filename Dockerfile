FROM node:18-alpine

WORKDIR /app

# Copy everything
COPY package.json ./
COPY server/ ./server/
COPY client/ ./client/

# Install ALL dependencies at root level (avoids module conflicts)
RUN npm install

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
