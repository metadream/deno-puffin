import config from "../helpers/config.ts";
import { Autowired, Context, Controller, fs, Get, Put } from "../helpers/deps.ts";
import { CoverService } from "../services/CoverService.ts";

/**
 * 电影封面控制器
 * @Author metadream
 * @Since 2023-09-20
 */
@Controller()
export class CoverController {
    @Autowired
    coverService!: CoverService;

    // 接口：输出封面图片流
    @Get("/cover/:id")
    async cover(ctx: Context): Promise<ArrayBuffer | undefined> {
        ctx.path = config.COVER_HOME + "/" + ctx.params.id;
        if (fs.existsSync(ctx.path)) {
            return await ctx.serve(ctx);
        }
    }

    // 接口：获取封面生成状态
    @Get("/covers")
    state() {
        return this.coverService.getState();
    }

    // 接口：生成封面图片
    @Put("/covers")
    generate() {
        this.coverService.generate();
    }
}
