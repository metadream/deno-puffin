import config from "../helpers/config.ts";
import { Autowired, Context, Controller, Get, Post, Put, View } from "../helpers/deps.ts";
import { Setting } from "../helpers/types.ts";
import { SettingService } from "../services/SettingService.ts";

/**
 * 偏好设置控制器
 * @Author metadream
 * @Since 2023-09-15
 */
@Controller()
export class SettingController {
    @Autowired
    settingService!: SettingService;

    // 页面：初始化
    @Get("/init")
    @View("init.html")
    init() {
        return { METAFIELDS: config.METAFIELDS };
    }

    // 接口：初始化
    @Post("/init")
    async initSettings(ctx: Context): Promise<string> {
        const { user } = await this.saveSettings(ctx);
        const sessId = await this.settingService.login(user);
        ctx.cookies.set(config.SESSION_KEY, sessId);
        return sessId;
    }

    // 接口：更新设置
    @Put("/settings")
    async saveSettings(ctx: Context): Promise<Setting> {
        const setting = await this.populate(ctx);
        await this.settingService.saveUser(setting.user);
        await this.settingService.savePreferences(setting.preferences);
        return setting;
    }

    private async populate(ctx: Context): Promise<Setting> {
        // deno-lint-ignore no-explicit-any
        const data: any = await ctx.json();
        return {
            user: {
                username: data.username,
                password: data.password,
            },
            preferences: {
                metafields: data.metafields ? data.metafields.split(",") : [],
                library: data.library,
                codify: !!data.codify,
            },
        };
    }
}
