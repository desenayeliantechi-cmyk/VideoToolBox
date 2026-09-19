const { execFile } = require("child_process");

execFile("ffmpeg", ["-version"], (error, stdout, stderr) => {
    if (error) {
        console.error("❌ FFmpeg no pudo ejecutarse:");
        console.error(error.message);
        return;
    }

    console.log("✅ FFmpeg funciona desde Node.js");
    console.log(stdout.split("\n")[0]);
});