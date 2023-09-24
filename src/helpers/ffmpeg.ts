// deno-lint-ignore-file no-explicit-any
import config from "./config.ts";
import { delay, fs } from "./deps.ts";
import { MediaInfo } from "./types.ts";

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
    mediainfo(input: string): MediaInfo {
        const ffprobe = new Deno.Command("ffprobe", {
            args: ["-i", input, "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams"],
        });

        const { streams, format } = JSON.parse(textDecoder.decode(ffprobe.outputSync().stdout));
        const mediaInfo: MediaInfo = {};

        if (format) {
            Object.assign(mediaInfo, {
                size: parseInt(format.size),
                duration: parseFloat(format.duration),
                bitRate: parseInt(format.bit_rate),
            });
        }
        if (streams) {
            const vs = streams.find((v: any) => v.codec_type == "video");
            const fr = vs.r_frame_rate.split("/");
            const fps = (fr[0] / fr[1]).toFixed(2);
            mediaInfo.video = {
                codec: vs.codec_name,
                width: vs.width,
                height: vs.height,
                aspectRatio: vs.display_aspect_ratio,
                frameRate: parseFloat(fps),
                bitRate: parseInt(vs.bit_rate),
            };
            const as = streams.find((v: any) => v.codec_type == "audio");
            mediaInfo.audio = {
                codec: as.codec_name,
                channels: as.channels,
                sampleRate: parseInt(as.sample_rate),
                bitRate: parseInt(as.bit_rate),
            };
        }
        return mediaInfo;
    },

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
