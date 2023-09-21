import { delay, fs } from "./deps.ts";

/**
 * FFMPEG服务
 * @Author metadream
 * @Since 2023-09-09
 */
export const ffmpeg = {
    // 截取视频第10秒作为封面
    // -ss放在最前面可显著加快执行速度
    capture(input: string, output: string): void {
        const ffmpeg = new Deno.Command("ffmpeg", {
            args: ["-ss", "00:00:10", "-i", input, "-frames:v", "1", "-f", "mjpeg", "-y", output],
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
            if (timeout > 10000) throw { status: 500, message: "视频转码失败" };
            timeout += 100;
            await delay(100);
        }
        return proc;
    },
};
