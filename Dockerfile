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

RUN git clone --single-branch --branch 2.0.0 \
    https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git \
    /opt/bgutil-ytdlp-pot-provider

# Compilar el proveedor
RUN cd /opt/bgutil-ytdlp-pot-provider/server \
    && npm ci \
    && npx tsc

# ============================================================
# Instalar el plugin como ZIP en la carpeta oficial
# de plugins de yt-dlp
# ============================================================

RUN mkdir -p /root/.config/yt-dlp/plugins \
    && cd /opt/bgutil-ytdlp-pot-provider \
    && git archive --format=zip --output=/root/.config/yt-dlp/plugins/bgutil-ytdlp-pot-provider.zip 2.0.0 plugin

# ============================================================

COPY . .

RUN chmod +x server/yt-dlp 2>/dev/null || true

EXPOSE 3000

CMD ["node", "server/server.js"]