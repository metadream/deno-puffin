import config from "../helpers/config.ts";
import { Attribute, Autowired, Component, formatBytes, formatDate } from "../helpers/deps.ts";
import { SettingService } from "../services/SettingService.ts";

/**
 * 全局模板属性
 * @Author metadream
 * @Since 2023-09-09
 */
@Component
export class Attributes {
    @Autowired
    settingService!: SettingService;

    @Attribute
    async hasMetafield(): Promise<(key: string) => boolean> {
        const metafields = await this.settingService.getMetafields();
        return (key: string) => metafields.includes(key);
    }

    @Attribute
    region() {
        return config.REGION;
    }

    @Attribute
    quality() {
        return config.QUALITY;
    }

    @Attribute
    censorship() {
        return config.CENSORSHIP;
    }

    @Attribute
    rating() {
        return config.RATING;
    }

    @Attribute
    appName() {
        return config.APP_NAME;
    }

    @Attribute
    appVersion() {
        return config.APP_VERSION;
    }

    @Attribute
    formatDate() {
        return formatDate;
    }

    @Attribute
    formatBytes() {
        return formatBytes;
    }
}
