const fs = require("fs");
const path = require("path");
const https = require("https");

const outputPath = path.join(__dirname, "yt-dlp");

function download(url) {
    return new Promise((resolve, reject) => {

        https.get(url, (response) => {

            // Seguir redirecciones de GitHub
            if (
                response.statusCode >= 300 &&
                response.statusCode < 400 &&
                response.headers.location
            ) {
                console.log("↪️ Siguiendo redirección...");

                response.resume();

                download(response.headers.location)
                    .then(resolve)
                    .catch(reject);

                return;
            }

            if (response.statusCode !== 200) {
                response.resume();

                reject(
                    new Error(
                        `Código HTTP: ${response.statusCode}`
                    )
                );

                return;
            }

            const file = fs.createWriteStream(outputPath);

            response.pipe(file);

            file.on("finish", () => {
                file.close();
                resolve();
            });

            file.on("error", reject);

        }).on("error", reject);
    });
}

async function install() {

    console.log("⬇️ Instalando yt-dlp para Linux...");

    try {

        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        await download(
            "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
        );

        fs.chmodSync(outputPath, 0o755);

        console.log("✅ yt-dlp instalado correctamente.");
        console.log(`📁 Ubicación: ${outputPath}`);

    } catch (error) {

        console.error(
            "❌ Error instalando yt-dlp:",
            error.message
        );

        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        process.exit(1);
    }
}

install();