import config from "../helpers/config.ts";
import { Autowired, Context, Controller, Get, Post, Put, View } from "../helpers/deps.ts";
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
    async initSettings(ctx: Context) {
        return await this.saveSettings(ctx);
    }

    // 接口：更新设置
    @Put("/settings")
    async saveSettings(ctx: Context) {
        // deno-lint-ignore no-explicit-any
        const data: any = await ctx.json();
        await this.settingService.saveUser({
            username: data.username,
            password: data.password,
        });
        await this.settingService.savePreferences({
            metafields: data.metafields ? data.metafields.split(",") : [],
            library: data.library,
            codify: !!data.codify,
        });
        return true;
    }
}
