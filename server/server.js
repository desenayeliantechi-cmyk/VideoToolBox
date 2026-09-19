const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const multer = require("multer");

require("dotenv").config();


// ============================================================
// CONFIGURACIÓN
// ============================================================

const PORT = process.env.PORT || 3000;

const DOWNLOADS_DIR =
    path.join(__dirname, "downloads");

const YTDLP_PATH =
    path.join(__dirname, "yt-dlp.exe");


// ============================================================
// COMPROBAR / CREAR CARPETA DOWNLOADS
// ============================================================

if (!fs.existsSync(DOWNLOADS_DIR)) {

    fs.mkdirSync(
        DOWNLOADS_DIR,
        {
            recursive: true
        }
    );

}


// ============================================================
// COMPROBAR YT-DLP
// ============================================================

if (!fs.existsSync(YTDLP_PATH)) {

    console.error("");
    console.error(
        "❌ No se encontró yt-dlp.exe"
    );

    console.error(
        `📁 Ruta esperada: ${YTDLP_PATH}`
    );

    console.error("");

}


// ============================================================
// MULTER - SUBIDA DE ARCHIVOS
// ============================================================

const storage =
    multer.diskStorage({

        destination:
            function (req, file, cb) {

                cb(
                    null,
                    DOWNLOADS_DIR
                );

            },

        filename:
            function (req, file, cb) {

                const originalName =
                    path.basename(
                        file.originalname
                    );

                const safeName =
                    originalName.replace(
                        /[^a-zA-Z0-9._-]/g,
                        "_"
                    );

                const finalName =
                    `${Date.now()}-${safeName}`;

                cb(
                    null,
                    finalName
                );

            }

    });


const upload =
    multer({

        storage: storage,

        limits: {

            fileSize:
                500 * 1024 * 1024

        }

    });


// ============================================================
// CORS
// ============================================================

function setCORS(res) {

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

}


// ============================================================
// RESPUESTA JSON
// ============================================================

function sendJSON(
    res,
    statusCode,
    data
) {

    setCORS(res);

    res.writeHead(
        statusCode,
        {
            "Content-Type":
                "application/json; charset=utf-8"
        }
    );

    res.end(
        JSON.stringify(data)
    );

}


// ============================================================
// LEER BODY JSON
// ============================================================

function readBody(req) {

    return new Promise(
        (resolve, reject) => {

            let body = "";

            req.on(
                "data",
                chunk => {

                    body +=
                        chunk.toString();

                }
            );

            req.on(
                "end",
                () => {

                    try {

                        const data =
                            body
                                ? JSON.parse(body)
                                : {};

                        resolve(data);

                    } catch (error) {

                        reject(error);

                    }

                }
            );

            req.on(
                "error",
                reject
            );

        }
    );

}


// ============================================================
// VALIDAR URL
// ============================================================

function isValidURL(value) {

    try {

        const parsed =
            new URL(value);

        return (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        );

    } catch {

        return false;

    }

}


// ============================================================
// DETECTAR PLATAFORMA
// ============================================================

function detectPlatform(url) {

    const lower =
        String(url)
            .toLowerCase();

    if (
        lower.includes("youtube.com") ||
        lower.includes("youtu.be")
    ) {

        return "YouTube";

    }

    if (
        lower.includes("tiktok.com")
    ) {

        return "TikTok";

    }

    if (
        lower.includes("instagram.com")
    ) {

        return "Instagram";

    }

    if (
        lower.includes("facebook.com") ||
        lower.includes("fb.watch")
    ) {

        return "Facebook";

    }

    return "Desconocida";

}


// ============================================================
// MIME TYPES
// ============================================================

function getMimeType(fileName) {

    const ext =
        path.extname(fileName)
            .toLowerCase();

    const mimeTypes = {

        ".mp4":
            "video/mp4",

        ".webm":
            "video/webm",

        ".mkv":
            "video/x-matroska",

        ".avi":
            "video/x-msvideo",

        ".mov":
            "video/quicktime",

        ".mp3":
            "audio/mpeg",

        ".wav":
            "audio/wav",

        ".aac":
            "audio/aac",

        ".m4a":
            "audio/mp4"

    };

    return (
        mimeTypes[ext] ||
        "application/octet-stream"
    );

}


// ============================================================
// EJECUTAR YT-DLP
// ============================================================

function runYtDlp(
    args,
    maxBuffer = 20 * 1024 * 1024
) {

    return new Promise(
        (resolve, reject) => {

            if (
                !fs.existsSync(
                    YTDLP_PATH
                )
            ) {

                reject(
                    new Error(
                        "No se encontró yt-dlp.exe en la carpeta server."
                    )
                );

                return;

            }

            execFile(
                YTDLP_PATH,
                args,
                {
                    windowsHide: true,
                    maxBuffer: maxBuffer
                },
                (
                    error,
                    stdout,
                    stderr
                ) => {

                    if (error) {

                        console.error(
                            "❌ Error yt-dlp:"
                        );

                        console.error(
                            stderr
                        );

                        reject(
                            new Error(
                                stderr ||
                                error.message
                            )
                        );

                        return;

                    }

                    resolve({
                        stdout,
                        stderr
                    });

                }
            );

        }
    );

}


// ============================================================
// OBTENER METADATA
// ============================================================

async function getVideoMetadata(url) {

    console.log("");
    console.log(
        "========================================"
    );

    console.log(
        "🔎 OBTENIENDO METADATA"
    );

    console.log(
        "🔗 URL:",
        url
    );

    console.log(
        "========================================"
    );

    const args = [

        "--js-runtimes",
        "node",

        "--dump-single-json",

        "--skip-download",

        "--no-warnings",

        "--no-playlist",

        url

    ];

    const result =
        await runYtDlp(
            args,
            20 * 1024 * 1024
        );

    let data;

    try {

        data =
            JSON.parse(
                result.stdout
            );

    } catch (error) {

        console.error(
            "❌ JSON recibido:"
        );

        console.error(
            result.stdout
        );

        throw new Error(
            "yt-dlp no devolvió metadata válida."
        );

    }

    return data;

}


// ============================================================
// CONVERTIR A MP4
// ============================================================

function convertToMP4(
    inputPath,
    outputPath
) {

    return new Promise(
        (resolve, reject) => {

            const args = [

                "-y",

                "-i",
                inputPath,

                "-c:v",
                "libx264",

                "-preset",
                "veryfast",

                "-crf",
                "23",

                "-c:a",
                "aac",

                "-b:a",
                "128k",

                outputPath

            ];

            console.log(
                "🎬 FFmpeg MP4:"
            );

            console.log(
                args.join(" ")
            );

            execFile(
                "ffmpeg",
                args,
                {
                    windowsHide: true
                },
                (
                    error,
                    stdout,
                    stderr
                ) => {

                    if (error) {

                        console.error(
                            "❌ Error FFmpeg MP4:"
                        );

                        console.error(
                            stderr
                        );

                        reject(error);

                        return;

                    }

                    console.log(
                        "✅ Conversión MP4 completada."
                    );

                    resolve();

                }
            );

        }
    );

}


// ============================================================
// CONVERTIR A MP3
// ============================================================

function convertToMP3(
    inputPath,
    outputPath
) {

    return new Promise(
        (resolve, reject) => {

            const args = [

                "-y",

                "-i",
                inputPath,

                "-vn",

                "-c:a",
                "libmp3lame",

                "-b:a",
                "192k",

                outputPath

            ];

            console.log(
                "🎵 FFmpeg MP3:"
            );

            console.log(
                args.join(" ")
            );

            execFile(
                "ffmpeg",
                args,
                {
                    windowsHide: true
                },
                (
                    error,
                    stdout,
                    stderr
                ) => {

                    if (error) {

                        console.error(
                            "❌ Error FFmpeg MP3:"
                        );

                        console.error(
                            stderr
                        );

                        reject(error);

                        return;

                    }

                    console.log(
                        "✅ Conversión MP3 completada."
                    );

                    resolve();

                }
            );

        }
    );

}


// ============================================================
// DESCARGAR VIDEO DESDE URL
// ============================================================

async function downloadFromURL(
    url,
    format
) {

    const timestamp =
        Date.now();

    const outputTemplate =
        path.join(
            DOWNLOADS_DIR,
            `${timestamp}-%(title)s.%(ext)s`
        );

    console.log("");
    console.log(
        "========================================"
    );

    console.log(
        "⬇️ NUEVA DESCARGA DESDE URL"
    );

    console.log(
        "🔗 URL:",
        url
    );

    console.log(
        "🎯 Formato:",
        format
    );

    console.log(
        "========================================"
    );


    let args;


    // ========================================================
    // MP3
    // ========================================================

    if (
        format === "MP3"
    ) {

        args = [

            "--js-runtimes",
            "node",

            "--no-playlist",

            "--no-warnings",

            "-x",

            "--audio-format",
            "mp3",

            "--audio-quality",
            "192K",

            "-o",
            outputTemplate,

            url

        ];

    }


    // ========================================================
    // MP4
    // ========================================================

    else {

        args = [

            "--js-runtimes",
            "node",

            "--no-playlist",

            "--no-warnings",

            "-f",
            "bv*+ba/b",

            "--merge-output-format",
            "mp4",

            "-o",
            outputTemplate,

            url

        ];

    }


    const result =
        await runYtDlp(
            args,
            50 * 1024 * 1024
        );


    console.log(
        result.stdout
    );


    // ========================================================
    // ENCONTRAR ARCHIVO GENERADO
    // ========================================================

    const files =
        fs.readdirSync(
            DOWNLOADS_DIR
        );

    const candidates =
        files
            .filter(
                file => {

                    const fullPath =
                        path.join(
                            DOWNLOADS_DIR,
                            file
                        );

                    if (
                        !fs.statSync(
                            fullPath
                        ).isFile()
                    ) {

                        return false;

                    }

                    return (
                        file.startsWith(
                            String(timestamp) + "-"
                        )
                    );

                }
            )
            .sort(
                (a, b) => {

                    const aTime =
                        fs.statSync(
                            path.join(
                                DOWNLOADS_DIR,
                                a
                            )
                        ).mtimeMs;

                    const bTime =
                        fs.statSync(
                            path.join(
                                DOWNLOADS_DIR,
                                b
                            )
                        ).mtimeMs;

                    return bTime - aTime;

                }
            );


    if (
        candidates.length === 0
    ) {

        throw new Error(
            "yt-dlp terminó pero no se encontró el archivo descargado."
        );

    }


    const fileName =
        candidates[0];


    console.log(
        "✅ Archivo descargado:",
        fileName
    );


    return fileName;

}


// ============================================================
// SERVIDOR
// ============================================================

const server =
    http.createServer(
        async (req, res) => {

            setCORS(res);


            // =================================================
            // OPTIONS
            // =================================================

            if (
                req.method ===
                "OPTIONS"
            ) {

                res.writeHead(
                    204
                );

                res.end();

                return;

            }


            // =================================================
            // GET /api/status
            // =================================================

            if (
                req.method === "GET" &&
                req.url === "/api/status"
            ) {

                sendJSON(
                    res,
                    200,
                    {

                        success:
                            true,

                        server:
                            "VideoToolBox API",

                        status:
                            "online",

                        port:
                            PORT,

                        ffmpeg:
                            "available",

                        ytdlp:
                            fs.existsSync(
                                YTDLP_PATH
                            )
                                ? "available"
                                : "missing",

                        upload:
                            "available",

                        conversion:
                            "available",

                        urlDownload:
                            "available"

                    }
                );

                return;

            }


            // =================================================
            // POST /api/upload
            // =================================================

            if (
                req.method === "POST" &&
                req.url === "/api/upload"
            ) {

                upload.single("video")(
                    req,
                    res,
                    function(error) {

                        if (error) {

                            console.error(
                                "❌ Error al subir:"
                            );

                            console.error(
                                error
                            );

                            sendJSON(
                                res,
                                400,
                                {

                                    success:
                                        false,

                                    message:
                                        error.message

                                }
                            );

                            return;

                        }


                        if (!req.file) {

                            sendJSON(
                                res,
                                400,
                                {

                                    success:
                                        false,

                                    message:
                                        "No se recibió ningún archivo."

                                }
                            );

                            return;

                        }


                        console.log(
                            "📁 Archivo recibido:"
                        );

                        console.log(
                            req.file.filename
                        );


                        sendJSON(
                            res,
                            200,
                            {

                                success:
                                    true,

                                message:
                                    "Archivo subido correctamente.",

                                file:
                                    req.file.filename,

                                originalName:
                                    req.file.originalname,

                                size:
                                    req.file.size,

                                path:
                                    req.file.path

                            }
                        );

                    }
                );

                return;

            }


            // =================================================
            // POST /api/analyze
            // =================================================

            if (
                req.method === "POST" &&
                req.url === "/api/analyze"
            ) {

                try {

                    const body =
                        await readBody(
                            req
                        );

                    const url =
                        String(
                            body.url || ""
                        ).trim();


                    if (!url) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "Debes proporcionar una URL."

                            }
                        );

                        return;

                    }


                    if (
                        !isValidURL(url)
                    ) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "El enlace no es válido."

                            }
                        );

                        return;

                    }


                    const platform =
                        detectPlatform(
                            url
                        );


                    console.log(
                        `🔎 Plataforma detectada: ${platform}`
                    );


                    sendJSON(
                        res,
                        200,
                        {

                            success:
                                true,

                            platform:
                                platform,

                            title:
                                "Video detectado",

                            message:
                                platform ===
                                "Desconocida"

                                    ? "Plataforma no identificada."

                                    : `Se detectó ${platform} correctamente.`

                        }
                    );


                } catch (error) {

                    console.error(
                        error
                    );

                    sendJSON(
                        res,
                        400,
                        {

                            success:
                                false,

                            message:
                                "La solicitud no es válida."

                        }
                    );

                }

                return;

            }


            // =================================================
            // POST /api/metadata
            // =================================================

            if (
                req.method === "POST" &&
                req.url === "/api/metadata"
            ) {

                try {

                    const body =
                        await readBody(
                            req
                        );

                    const url =
                        String(
                            body.url || ""
                        ).trim();


                    if (!url) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "No se recibió la URL."

                            }
                        );

                        return;

                    }


                    if (
                        !isValidURL(url)
                    ) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "El enlace no es válido."

                            }
                        );

                        return;

                    }


                    const platform =
                        detectPlatform(
                            url
                        );


                    const data =
                        await getVideoMetadata(
                            url
                        );


                    const title =
                        data.title ||
                        "Video sin título";


                    const thumbnail =
                        data.thumbnail ||
                        null;


                    const duration =
                        data.duration ||
                        null;


                    sendJSON(
                        res,
                        200,
                        {

                            success:
                                true,

                            title:
                                title,

                            platform:
                                platform,

                            duration:
                                duration,

                            thumbnail:
                                thumbnail,

                            uploader:
                                data.uploader ||
                                data.channel ||
                                null,

                            webpage_url:
                                data.webpage_url ||
                                url,

                            message:
                                "Metadata obtenida correctamente."

                        }
                    );


                } catch (error) {

                    console.error(
                        "❌ Error obteniendo metadata:"
                    );

                    console.error(
                        error.message
                    );


                    sendJSON(
                        res,
                        500,
                        {

                            success:
                                false,

                            message:
                                "No se pudo obtener la información del video.",

                            error:
                                error.message

                        }
                    );

                }

                return;

            }


            // =================================================
            // POST /api/download-url
            // =================================================

            if (
                req.method === "POST" &&
                req.url === "/api/download-url"
            ) {

                try {

                    const body =
                        await readBody(
                            req
                        );


                    const url =
                        String(
                            body.url || ""
                        ).trim();


                    const format =
                        String(
                            body.format ||
                            "MP4"
                        ).toUpperCase();


                    if (!url) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "Debes proporcionar una URL."

                            }
                        );

                        return;

                    }


                    if (
                        !isValidURL(url)
                    ) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "El enlace no es válido."

                            }
                        );

                        return;

                    }


                    if (
                        format !== "MP4" &&
                        format !== "MP3"
                    ) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "Formato no compatible. Usa MP4 o MP3."

                            }
                        );

                        return;

                    }


                    const platform =
                        detectPlatform(
                            url
                        );


                    const fileName =
                        await downloadFromURL(
                            url,
                            format
                        );


                    sendJSON(
                        res,
                        200,
                        {

                            success:
                                true,

                            message:
                                "Descarga preparada correctamente.",

                            platform:
                                platform,

                            file:
                                fileName,

                            format:
                                format,

                            download:
                                `/api/download?file=${encodeURIComponent(fileName)}`

                        }
                    );


                } catch (error) {

                    console.error(
                        "❌ Error descargando desde URL:"
                    );

                    console.error(
                        error
                    );


                    sendJSON(
                        res,
                        500,
                        {

                            success:
                                false,

                            message:
                                "No se pudo descargar el video desde el enlace.",

                            error:
                                error.message

                        }
                    );

                }

                return;

            }


            // =================================================
            // POST /api/convert
            // =================================================

            if (
                req.method === "POST" &&
                req.url === "/api/convert"
            ) {

                try {

                    const body =
                        await readBody(
                            req
                        );


                    const file =
                        String(
                            body.file || ""
                        ).trim();


                    const format =
                        String(
                            body.format ||
                            "MP4"
                        ).toUpperCase();


                    if (!file) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "No se indicó ningún archivo."

                            }
                        );

                        return;

                    }


                    if (
                        format !== "MP4" &&
                        format !== "MP3"
                    ) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "Formato no compatible. Usa MP4 o MP3."

                            }
                        );

                        return;

                    }


                    const safeFile =
                        path.basename(
                            file
                        );


                    const inputPath =
                        path.join(
                            DOWNLOADS_DIR,
                            safeFile
                        );


                    if (
                        !fs.existsSync(
                            inputPath
                        )
                    ) {

                        sendJSON(
                            res,
                            404,
                            {

                                success:
                                    false,

                                message:
                                    "El archivo no existe en el servidor."

                            }
                        );

                        return;

                    }


                    const originalBase =
                        path.basename(
                            safeFile,
                            path.extname(
                                safeFile
                            )
                        );


                    const outputName =
                        `${originalBase}-converted.${format.toLowerCase()}`;


                    const outputPath =
                        path.join(
                            DOWNLOADS_DIR,
                            outputName
                        );


                    console.log("");
                    console.log(
                        "========================================"
                    );

                    console.log(
                        "🔄 NUEVA CONVERSIÓN"
                    );

                    console.log(
                        `📁 Entrada: ${safeFile}`
                    );

                    console.log(
                        `🎯 Formato: ${format}`
                    );

                    console.log(
                        `📤 Salida: ${outputName}`
                    );


                    if (
                        format === "MP3"
                    ) {

                        await convertToMP3(
                            inputPath,
                            outputPath
                        );

                    } else {

                        await convertToMP4(
                            inputPath,
                            outputPath
                        );

                    }


                    console.log(
                        "========================================"
                    );


                    sendJSON(
                        res,
                        200,
                        {

                            success:
                                true,

                            message:
                                `Video convertido correctamente a ${format}.`,

                            input:
                                safeFile,

                            output:
                                outputName,

                            format:
                                format,

                            download:
                                `/api/download?file=${encodeURIComponent(outputName)}`

                        }
                    );


                } catch (error) {

                    console.error(
                        "❌ Error durante la conversión:"
                    );

                    console.error(
                        error
                    );


                    sendJSON(
                        res,
                        500,
                        {

                            success:
                                false,

                            message:
                                "No se pudo convertir el archivo.",

                            error:
                                error.message

                        }
                    );

                }

                return;

            }


            // =================================================
            // GET /api/download
            // =================================================

            if (
                req.method === "GET" &&
                req.url.startsWith(
                    "/api/download"
                )
            ) {

                try {

                    const parsedUrl =
                        new URL(
                            req.url,
                            `http://localhost:${PORT}`
                        );


                    const file =
                        parsedUrl.searchParams.get(
                            "file"
                        );


                    if (!file) {

                        sendJSON(
                            res,
                            400,
                            {

                                success:
                                    false,

                                message:
                                    "No se indicó ningún archivo."

                            }
                        );

                        return;

                    }


                    const safeFile =
                        path.basename(
                            file
                        );


                    const filePath =
                        path.join(
                            DOWNLOADS_DIR,
                            safeFile
                        );


                    if (
                        !fs.existsSync(
                            filePath
                        )
                    ) {

                        sendJSON(
                            res,
                            404,
                            {

                                success:
                                    false,

                                message:
                                    "El archivo no existe."

                            }
                        );

                        return;

                    }


                    const stat =
                        fs.statSync(
                            filePath
                        );


                    res.writeHead(
                        200,
                        {

                            "Content-Type":
                                getMimeType(
                                    safeFile
                                ),

                            "Content-Length":
                                stat.size,

                            "Content-Disposition":
                                `attachment; filename="${safeFile}"`

                        }
                    );


                    const stream =
                        fs.createReadStream(
                            filePath
                        );


                    stream.pipe(
                        res
                    );


                    stream.on(
                        "error",
                        error => {

                            console.error(
                                "❌ Error enviando archivo:",
                                error
                            );

                        }
                    );


                } catch (error) {

                    console.error(
                        error
                    );


                    sendJSON(
                        res,
                        500,
                        {

                            success:
                                false,

                            message:
                                "No se pudo descargar el archivo."

                        }
                    );

                }

                return;

            }


            // =================================================
            // 404
            // =================================================

            sendJSON(
                res,
                404,
                {

                    success:
                        false,

                    message:
                        "Ruta no encontrada."

                }
            );

        }
    );


// ============================================================
// INICIAR SERVIDOR
// ============================================================

server.listen(
    PORT,
    () => {

        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "🚀 VideoToolBox API funcionando"
        );

        console.log(
            `🌐 http://localhost:${PORT}`
        );

        console.log(
            "🎬 FFmpeg disponible"
        );

        console.log(
            "📁 Subida de videos disponible"
        );

        console.log(
            "🎵 Conversión MP3 disponible"
        );

        console.log(
            "🎥 Conversión MP4 disponible"
        );

        console.log(
            fs.existsSync(YTDLP_PATH)
                ? "⬇️ yt-dlp disponible"
                : "❌ yt-dlp NO encontrado"
        );

        console.log(
            "🔗 Descarga por URL disponible"
        );

        console.log(
            "========================================"
        );

        console.log("");

    }
);