FROM node:20-slim

# Install ffmpeg and ffprobe for audio analysis engine
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy application files
COPY package*.json ./
COPY . .

# Create secure data storage
RUN mkdir -p data && chmod 700 data

# Expose default port
EXPOSE 4198

ENV FORMU_PREVIEW_PORT=4198
ENV HOST=0.0.0.0
ENV NODE_ENV=production

CMD ["node", "preview-server.mjs"]
