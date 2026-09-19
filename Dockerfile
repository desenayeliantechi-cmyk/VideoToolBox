FROM node:24-bookworm

# Instalar FFmpeg y herramientas necesarias
RUN apt-get update \
    && apt-get install -y ffmpeg python3 curl unzip git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar primero los archivos necesarios del servidor
COPY server/package*.json ./server/
COPY server/install-ytdlp.js ./server/

# Instalar dependencias del servidor
RUN cd /app/server && npm install

# Instalar yt-dlp para Linux
RUN node /app/server/install-ytdlp.js

# Instalar plugin bgutil
RUN mkdir -p /root/.config/yt-dlp/plugins \
    && curl -L \
    "https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/download/2.0.0/bgutil-ytdlp-pot-provider.zip" \
    -o /root/.config/yt-dlp/plugins/bgutil-ytdlp-pot-provider.zip

# Descargar bgutil para generar el proveedor de PO Token
RUN git clone --single-branch --branch 2.0.0 \
    https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git \
    /opt/bgutil-ytdlp-pot-provider

# Compilar bgutil
RUN cd /opt/bgutil-ytdlp-pot-provider/server \
    && npm ci \
    && npx tsc

# AHORA copiar el proyecto completo
COPY . /app

# Asegurar permisos de yt-dlp
RUN chmod +x /app/server/yt-dlp 2>/dev/null || true

# Verificar que server.js existe
RUN test -f /app/server/server.js

EXPOSE 3000

CMD ["node", "/app/server/server.js"]