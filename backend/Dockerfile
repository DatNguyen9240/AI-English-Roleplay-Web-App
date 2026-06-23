FROM node:20-slim

# Install system dependencies (build tools, git, curl, openssl)
RUN apt-get update -y && apt-get install -y \
    openssl \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Clone and compile whisper.cpp at /app/whisper
WORKDIR /app/whisper
RUN git clone https://github.com/ggerganov/whisper.cpp.git . && \
    git checkout v1.5.4 && \
    make -j$(nproc)

# Download the default ggml-base.en.bin model
RUN bash ./models/download-ggml-model.sh base.en

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

# Generate Prisma Client at build time
RUN npx prisma generate

# Run database push and seed on container startup, then start server
CMD [ "sh", "-c", "npx prisma db push && npx prisma db seed && npm start" ]

