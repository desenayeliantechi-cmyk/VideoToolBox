FROM node:24-bookworm

RUN apt-get update \
    && apt-get install -y ffmpeg python3 curl unzip git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ============================================================
# Instalar dependencias del servidor
# ============================================================

COPY server/package*.json ./server/
COPY server/install-ytdlp.js ./server/

RUN cd server && npm install

# ============================================================
# Instalar yt-dlp
# ============================================================

RUN node server/install-ytdlp.js

# ============================================================
# Instalar bgutil-ytdlp-pot-provider 2.0.0
# ============================================================

RUN mkdir -p /root/.config/yt-dlp/plugins \
    && curl -L \
    "https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/2.0.0/bgutil-ytdlp-pot-provider.zip" \
    -o /root/.config/yt-dlp/plugins/bgutil-ytdlp-pot-provider.zip

# Instalar el proveedor de generación de PO Tokens
RUN git clone --single-branch --branch 2.0.0 \
    https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git \
    /opt/bgutil-ytdlp-pot-provider

RUN cd /opt/bgutil-ytdlp-pot-provider/server \
    && npm ci \
    && npx tsc

# ============================================================
RUN chmod +x server/yt-dlp 2>/dev/null || true

EXPOSE 3000

CMD ["node", "server/server.js"]