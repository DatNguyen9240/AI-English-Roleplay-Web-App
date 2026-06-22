# Stage 1: Build
FROM node:20-slim AS build

WORKDIR /app

# Copy root package.json and packages to resolve the "file:.." monorepo reference
COPY package*.json ./
COPY packages/ ./packages/

# Install and build shared-contracts first
RUN npm ci --prefix packages/shared-contracts && npm run build --prefix packages/shared-contracts

# Copy and install frontend dependencies
COPY frontend/package*.json ./frontend/
RUN npm ci --prefix frontend

# Copy frontend source code and build
COPY frontend/ ./frontend/
RUN npm run build --prefix frontend

# Stage 2: Serve
FROM nginx:alpine

# Install openssl to generate self-signed cert
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/nginx-selfsigned.key \
    -out /etc/nginx/certs/nginx-selfsigned.crt \
    -subj "/CN=ai-english-roleplay"

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
