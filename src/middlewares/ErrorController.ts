import { Autowired, Component, Context, ErrorHandler } from "../helpers/deps.ts";
import { SettingService } from "../services/SettingService.ts";

/**
 * 统一错误处理
 * @Author metadream
 * @Since 2023-09-09
 */
@Component
export class ErrorController {
    @Autowired
    settingService!: SettingService;

    constructor() {
        addEventListener("unhandledrejection", (e) => {
            console.error(e.reason);
            e.preventDefault();
        });
    }

    @ErrorHandler
    async error(ctx: Context, err: Error) {
        const error = {
            status: ctx.status,
            message: err.message,
        };
        const isReady = await this.settingService.isReady();
        return !isReady || !ctx.template ? error : ctx.view("error.html", error);
    }
}
