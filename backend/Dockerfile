FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm install tsx typescript

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/app.js"]
