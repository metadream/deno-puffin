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
    streaming(id: string, range: string | null): Record<string, Uint8Array | number> | undefined {
        if (!range) return;
        const movie = this.movieService.get(id);
        if (!movie) {
            throw { status: 404, message: "未找到相关电影" };
        }

        const source = movie.videoPath;
        const entry = Deno.statSync(source);
        const total = entry.size;

        const bytes = range.replace("bytes=", "").split("-", 2);
        const start = bytes[0] ? Number(bytes[0]) : 0;
        let end = bytes[1] ? Number(bytes[1]) : 0;
        // Safari 首次发送 range 值为 bytes=0-1
        end = end == 1 ? 1 : Math.min(start + config.VIDEO_CHUNK_SIZE, total - 1);
        const length = end - start + 1;

        const file = Deno.openSync(source);
        Deno.seekSync(file.rid, start, Deno.SeekMode.Start);
        const buff = new Uint8Array(length);
        file.readSync(buff);
        file.close();
        return { buff, start, end, total, length };
    }

    // 页面刷新或关闭后的清理
    dispose(playId: string): void {
        console.log("Dispose - playId:", playId);

        // 终止FFMPEG转码进程
        const proc = cache.get(playId) as Deno.ChildProcess;
        if (proc) {
            try {
                proc.kill("SIGKILL");
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
