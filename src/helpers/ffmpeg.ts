import config from "./config.ts";
import { delay, fs } from "./deps.ts";

const textDecoder = new TextDecoder();
function parseFormat(stdout: Uint8Array) {
    const json = JSON.parse(textDecoder.decode(stdout));
    return json.format || json;
}

/**
 * FFMPEG服务
 * @Author metadream
 * @Since 2023-09-09
 */
export const ffmpeg = {
    // -ss放在最前面表示截取关键帧，可显著加快执行速度
    capture(input: string, output: string): void {
        const ffprobe = new Deno.Command("ffprobe", {
            args: ["-i", input, "-v", "quiet", "-print_format", "json", "-show_format"],
        });
        const { duration } = parseFormat(ffprobe.outputSync().stdout);
        if (!duration) return;

        const time = String(Math.floor(parseInt(duration) / 2));
        const ffmpeg = new Deno.Command("ffmpeg", {
            args: [
                "-ss",
                time,
                "-i",
                input,
                "-vf",
                "scale=-1:540",
                "-frames:v",
                "1",
                "-f",
                "mjpeg",
                "-y",
                output,
            ],
        });
        ffmpeg.outputSync();
    },

    // HLS转码
    async transcode(input: string, output: string): Promise<Deno.ChildProcess> {
        const proc = new Deno.Command("ffmpeg", {
            args: [
                "-i",
                input,
                "-bsf:v",
                "h264_mp4toannexb",
                "-hls_list_size",
                "0",
                "-hls_time",
                "10",
                "-hls_flags",
                "split_by_time",
                "-preset:v",
                "ultrafast",
                "-f",
                "hls",
                output,
            ],
        }).spawn();

        // 检测m3u8文件是否被创建 (10秒超时)
        let timeout = 0;
        while (!fs.existsSync(output)) {
            if (timeout > config.VIDEO_TRANSCODE_TIMEOUT) {
                proc.kill("SIGKILL");
                throw { status: 500, message: "视频转码失败" };
            }
            timeout += 100;
            await delay(100);
        }
        return proc;
    },
};
