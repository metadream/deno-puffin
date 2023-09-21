import config from "../helpers/config.ts";
import { Autowired, Context, Interceptor } from "../helpers/deps.ts";
import { cache } from "../helpers/utils.ts";
import { SettingService } from "../services/SettingService.ts";

/**
 * 统一拦截器
 * @Author metadream
 * @Since 2023-09-09
 */
@Interceptor
export class Passport {
    @Autowired
    settingService!: SettingService;

    // 初始化拦截
    async initialize(ctx: Context): Promise<boolean> {
        if (ctx.isStaticPath) return false;
        const isReady = await this.settingService.isReady();
        const isInitUrl = ctx.path === config.INIT_URL;

        if (isReady && isInitUrl) {
            ctx.redirect("/");
            return true;
        }
        if (!isReady && !isInitUrl) {
            ctx.redirect(config.INIT_URL);
            return true;
        }
        return false;
    }

    // 鉴权拦截
    authenticate(ctx: Context): boolean {
        const sessId = ctx.cookies.get(config.SESSION_KEY) as string;
        if (sessId && cache.get(sessId)) {
            ctx.authorized = true;
        }

        if (ctx.path == config.PROTECTED_URL) {
            if (ctx.authorized) {
                cache.ttl(sessId, config.SESSION_TIMEOUT);
            } else {
                throw { status: 401, message: "无访问权限" };
            }
        }
        return false;
    }
}
