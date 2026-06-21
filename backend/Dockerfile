FROM node:20-slim

WORKDIR /usr/src/app

# Copy root package.json and packages to resolve the "file:.." monorepo reference
COPY package*.json ./
COPY packages/ ./packages/

# Install and build shared-contracts first
RUN npm ci --prefix packages/shared-contracts && npm run build --prefix packages/shared-contracts

# Copy backend configuration and install dependencies
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend

# Copy backend application source
COPY backend/ ./backend/

EXPOSE 5000

WORKDIR /usr/src/app/backend
CMD [ "npm", "start" ]
