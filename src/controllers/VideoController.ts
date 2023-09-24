import config from "../helpers/config.ts";
import { Autowired, Context, Controller, Get, path, Post } from "../helpers/deps.ts";
import { VideoService } from "../services/VideoService.ts";

/**
 * 视频流控制器
 * @Author metadream
 * @Since 2023-09-09
 */
@Controller("/video")
export class VideoController {
    @Autowired
    videoService!: VideoService;

    // 接口：获取mp4格式视频流
    @Get("/:id\\.mp4")
    streaming(ctx: Context) {
        ctx.set("Content-Type", "video/mp4");
        const range = ctx.get("range");
        const id = ctx.params.id as string;
        const video = this.videoService.streaming(id, range);

        if (video) {
            ctx.set("Accept-Ranges", "bytes");
            ctx.set("Content-Range", `bytes ${video.start}-${video.end}/${video.total}`);
            ctx.set("Content-Length", String(video.length));
            ctx.status = 206;
            return video.stream;
        }
    }

    // 接口：获取HLS播放列表
    @Get("/:id\\.m3u8")
    async playlist(ctx: Context) {
        const id = ctx.params.id as string;
        const playId = ctx.query.playId as string;
        return await this.videoService.transcode(id, playId);
    }

    // 接口：获取HLS切片视频流
    @Get("/:id\\.ts")
    transcode(ctx: Context) {
        return Deno.readFileSync(path.join(config.TRANSCODE_HOME, ctx.params.id + ".ts"));
    }

    // 接口：终止转码进程并清理切片
    // 前端 unload 事件不支持异步请求，只能通过 navigator.sendBeacon 调用
    // 而 navigator.sendBeacon 只支持 POST 请求
    @Post("/:playId")
    dispose(ctx: Context) {
        const playId = ctx.params.playId as string;
        this.videoService.dispose(playId);
    }
}
