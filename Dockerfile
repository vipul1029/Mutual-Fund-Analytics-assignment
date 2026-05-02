# FROM node:20-alpine

# WORKDIR /app

# COPY package.json package-lock.json* ./
# RUN npm install

# COPY . .

# RUN npx prisma generate

# EXPOSE 3000

# CMD ["npm", "run", "start"]

FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

CMD ["npm", "run", "dev"]