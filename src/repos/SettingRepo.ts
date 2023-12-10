import { Component } from "../helpers/deps.ts";
import { Preferences, User } from "../helpers/types.ts";
import { kv } from "../helpers/utils.ts";

/**
 * 偏好设置键值存储
 * @Author metadream
 * @Since 2023-09-09
 */
@Component
export class SettingRepo {
    async getUser(): Promise<User> {
        return await this.list("user") as User;
    }

    async setUsername(username: string): Promise<void> {
        await kv.set(["user", "username"], username);
    }

    async setPassword(password: string): Promise<void> {
        await kv.set(["user", "password"], password);
    }

    async getPreferences(): Promise<Preferences> {
        return await this.list("preferences") as Preferences;
    }

    async getLibrary(): Promise<string> {
        return (await kv.get(["preferences", "library"])).value as string;
    }

    async setLibrary(path: string): Promise<void> {
        await kv.set(["preferences", "library"], path);
    }

    async getMetafields(): Promise<string[]> {
        return (await kv.get(["preferences", "metafields"])).value as string[];
    }

    async setMetafields(metafields: string[]): Promise<void> {
        await kv.set(["preferences", "metafields"], metafields);
    }

    async isCodify(): Promise<boolean> {
        return (await kv.get(["preferences", "codify"])).value as boolean;
    }

    async setCodify(codify: boolean): Promise<void> {
        await kv.set(["preferences", "codify"], codify);
    }

    private async list(prefix: string): Promise<Record<string, unknown>> {
        const entries = kv.list({ prefix: [prefix] });
        const result: Record<string, unknown> = {};
        for await (const entry of entries) {
            const key = entry.key[1] as string;
            result[key] = entry.value;
        }
        return result;
    }
}