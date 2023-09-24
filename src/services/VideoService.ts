import config from "../helpers/config.ts";
import { Autowired, Component, path } from "../helpers/deps.ts";
import { cache } from "../helpers/utils.ts";
import { ffmpeg } from "../helpers/ffmpeg.ts";
import { MovieService } from "./MovieService.ts";

/**
 * 视频流服务
 * @Author metadream
 * @Since 2023-09-09
 */
@Component
export class VideoService {
    @Autowired
    movieService!: MovieService;

    // HLS实时转码
    async transcode(id: string, playId: string): Promise<Uint8Array> {
        const playlist = path.join(config.TRANSCODE_HOME, playId) + ".m3u8";
        const movie = this.movieService.get(id);
        if (!movie) {
            throw { status: 404, message: "未找到相关电影" };
        }
        if (!cache.get(playId)) {
            const proc = await ffmpeg.transcode(movie.videoPath, playlist);
            cache.set(playId, proc);
        }
        return Deno.readFileSync(playlist);
    }

    // 根据Range请求头获取视频流
    streaming(id: string, range: string | null): Record<string, number | ReadableStream> | undefined {
        if (!range) return;
        const movie = this.movieService.get(id);
        if (!movie) throw { status: 404, message: "未找到相关电影" };

        // 获取文件大小
        const source = movie.videoPath;
        const total = Deno.statSync(source).size;

        // 解析Range请求头
        const bytes = range.replace("bytes=", "").split("-", 2);
        const start = bytes[0] ? Number(bytes[0]) : 0;
        let end = bytes[1] ? Number(bytes[1]) : 0;
        end = end == 1 ? 1 : Math.min(start + config.VIDEO_CHUNK_SIZE, total - 1); // Safari首次发送range值为bytes=0-1
        const length = end - start + 1;

        // 在请求开始位置打开文件
        const video = Deno.openSync(source, { read: true });
        Deno.seekSync(video.rid, start, Deno.SeekMode.Start);

        // 输出视频流
        const stream = new ReadableStream({
            async pull(controller) {
                const chunk = new Uint8Array(2048);
                try {
                    const read = await video.read(chunk);
                    if (read) {
                        controller.enqueue(chunk);
                    }
                } catch (_) {
                    controller.close();
                    video.close();
                }
            },
            cancel() {
                video.close();
            },
        });
        return { start, end, total, length, stream };
    }

    // 页面刷新或关闭后的清理
    dispose(playId: string): void {
        console.log("Dispose - playId:", playId);

        // 终止FFMPEG转码进程
        const proc = cache.get(playId) as Deno.ChildProcess;
        if (proc) {
            try {
                proc.kill("SIGKILL");
                cache.delete(playId);
            } catch (e) {
                console.log("kill ffmpeg process failed:", e.message);
            }
        }

        // 删除切片文件
        const segments = Deno.readDirSync(config.TRANSCODE_HOME);
        for (const seg of segments) {
            if (seg.name.startsWith(playId)) {
                Deno.removeSync(path.join(config.TRANSCODE_HOME, seg.name));
            }
        }
    }
}
