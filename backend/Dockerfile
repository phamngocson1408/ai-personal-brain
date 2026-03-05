FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install && npm install tsx typescript

COPY . .
RUN npm run build && cp -r src/db/migrations dist/db/

EXPOSE 3001
CMD ["node", "dist/app.js"]
