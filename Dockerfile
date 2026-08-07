FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY server/ ./server/
COPY client/ ./client/

RUN npm install
RUN cd server && npm install
RUN cd client && npm install && npm run build

RUN mkdir -p /app/data

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server/index.js"]
