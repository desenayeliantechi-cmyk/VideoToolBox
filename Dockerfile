FROM node:24-bookworm

RUN apt-get update \
    && apt-get install -y ffmpeg python3 curl unzip git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/package*.json ./server/
COPY server/install-ytdlp.js ./server/

RUN cd server && npm install

# Instalar yt-dlp
RUN node server/install-ytdlp.js

# ============================================================
# Instalar bgutil-ytdlp-pot-provider 2.0.0
# ============================================================

RUN git clone --single-branch --branch 2.0.0 \
    https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git \
    /opt/bgutil-ytdlp-pot-provider

# Instalar dependencias del proveedor
RUN cd /opt/bgutil-ytdlp-pot-provider/server \
    && npm ci \
    && npx tsc

# Instalar el plugin en la carpeta que reconoce yt-dlp
RUN mkdir -p /root/yt-dlp-plugins/bgutil-ytdlp-pot-provider \
    && cp -r /opt/bgutil-ytdlp-pot-provider/plugin/* \
       /root/yt-dlp-plugins/bgutil-ytdlp-pot-provider/

# ============================================================

COPY . .

RUN chmod +x server/yt-dlp 2>/dev/null || true

EXPOSE 3000

CMD ["node", "server/server.js"]