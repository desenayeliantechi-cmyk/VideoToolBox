FROM node:24-bookworm

RUN apt-get update \
    && apt-get install -y ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package*.json ./server/
COPY server/install-ytdlp.js ./server/

RUN cd server && npm install

COPY . .

RUN chmod +x server/yt-dlp 2>/dev/null || true

EXPOSE 3000

CMD ["node", "server/server.js"]