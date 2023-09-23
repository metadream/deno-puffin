import config from "../helpers/config.ts";
import { Autowired, Component, fs, sha1 } from "../helpers/deps.ts";
import { Preferences, User } from "../helpers/types.ts";
import { cache, nanoid } from "../helpers/utils.ts";
import { SettingRepo } from "../repos/SettingRepo.ts";

/**
 * 偏好设置服务
 * @Author metadream
 * @Since 2023-09-09
 */
@Component
export class SettingService {
    @Autowired
    settingRepo!: SettingRepo;

    // 是否已初始化
    async isReady(): Promise<boolean> {
        return !!(await this.getLibrary());
    }

    // 管理员登录
    async login(user: User): Promise<string> {
        const admin = await this.getUser();
        const username = await sha1(user.username);
        const password = await sha1(user.password);

        if (username !== admin.username || password !== admin.password) {
            throw { status: 401, message: "用户名或密码错误" };
        }
        const sessId = nanoid();
        cache.set(sessId, true, config.SESSION_TIMEOUT);
        return sessId;
    }

    // 保存管理员用户信息
    async saveUser(user: User): Promise<void> {
        if (user.username) {
            await this.settingRepo.setUsername(await sha1(user.username));
        }
        if (user.password) {
            await this.settingRepo.setPassword(await sha1(user.password));
        }
    }

    // 保存偏好设置
    async savePreferences(preferences: Preferences): Promise<void> {
        if (!preferences.library || !fs.existsSync(preferences.library)) {
            throw { status: 500, message: "媒体库路径不存在" };
        }
        await this.settingRepo.setLibrary(preferences.library);
        await this.settingRepo.setMetafields(preferences.metafields);
        await this.settingRepo.setCodify(preferences.codify);
    }

    async getUser(): Promise<User> {
        return await this.settingRepo.getUser();
    }

    async getPreferences(): Promise<Preferences> {
        return await this.settingRepo.getPreferences();
    }

    async getLibrary(): Promise<string> {
        return await this.settingRepo.getLibrary();
    }

    async getMetafields(): Promise<string[]> {
        return await this.settingRepo.getMetafields();
    }

    async isCodify(): Promise<boolean> {
        return await this.settingRepo.isCodify();
    }
}
