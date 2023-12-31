import config from "../helpers/config.ts";
import { Autowired, Context, Controller, fs, Get, Post, Put, View } from "../helpers/deps.ts";
import { nanoid } from "../helpers/utils.ts";
import { Movie } from "../helpers/types.ts";
import { SettingService } from "../services/SettingService.ts";
import { MovieService } from "../services/MovieService.ts";

/**
 * 电影元数据控制器
 * @Author metadream
 * @Since 2023-09-09
 */
@Controller()
export class MovieController {
    @Autowired
    settingService!: SettingService;
    @Autowired
    movieService!: MovieService;

    // 页面：获取电影列表
    @Get("/")
    @View("index.html")
    list(ctx: Context) {
        return this.movieService.search(ctx.query);
    }

    // 页面：获取精选电影列表
    @Get("/starred")
    @View("index.html")
    starred(ctx: Context) {
        ctx.query.starred = true;
        return this.movieService.search(ctx.query);
    }

    // 页面：获取单部电影详情
    @Get("/:code")
    @View("movie.html")
    detail(ctx: Context) {
        const code = ctx.params.code as string;
        const movie = this.movieService.getMovie(code);
        if (!movie) throw { status: 404, message: "未找到相关页面" };
        return { movie, playId: nanoid() };
    }

    // 页面：元数据管理
    @Get("/metadata")
    @View("metadata.html")
    async metadata(ctx: Context) {
        const pagination = this.movieService.search(ctx.query);
        return Object.assign(pagination, {
            completed: this.movieService.status().completed,
            preferences: await this.settingService.getPreferences(),
            METAFIELDS: config.METAFIELDS,
        });
    }

    // 接口：输出封面图片流
    @Get("/cover/:id")
    async cover(ctx: Context): Promise<ArrayBuffer | undefined> {
        ctx.path = config.COVER_HOME + "/" + ctx.params.id;
        if (fs.existsSync(ctx.path)) {
            return await ctx.serve(ctx);
        }
    }

    // 接口：修改元数据
    @Put("/metadata")
    async update(ctx: Context) {
        const movie = await ctx.json() as Movie;
        return await this.movieService.update(movie);
    }

    // 接口：扫描媒体库
    @Post("/scan")
    async scan() {
        await this.movieService.scan();
    }

    // 接口：获取扫描状态
    @Get("/status")
    status() {
        return this.movieService.status();
    }
}
