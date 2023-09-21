import config from "../helpers/config.ts";
import { Autowired, Context, Controller, Get, Post, View } from "../helpers/deps.ts";
import { cache, nanoid } from "../helpers/utils.ts";
import { User } from "../helpers/types.ts";
import { SettingService } from "../services/SettingService.ts";

/**
 * 用户控制器
 * @Author metadream
 * @Since 2023-09-09
 */
@Controller()
export class UserController {
    @Autowired
    settingService!: SettingService;

    // 页面：登录
    @Get("/login")
    @View("login.html")
    view(ctx: Context) {
        if (ctx.authorized) ctx.redirect("/metadata");
    }

    // 接口：登录
    @Post("/login")
    async login(ctx: Context) {
        const user = await ctx.json() as User;
        await this.settingService.login(user);

        const sessId = nanoid();
        cache.set(sessId, true, config.SESSION_TIMEOUT);
        ctx.cookies.set(config.SESSION_KEY, sessId);
        return true;
    }
}
