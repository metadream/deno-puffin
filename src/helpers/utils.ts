import { Cache, customAlphabet, Database, fs } from "./deps.ts";
import config from "./config.ts";

// 确保应用目录存在
fs.ensureDirSync(config.TRANSCODE_HOME);
fs.ensureDirSync(config.COVER_HOME);

export const nanoid = customAlphabet(config.ALPHABET, 8);
export const cache = new Cache();
export const db = new Database(config.DATABASE_FILE);
export const kv = await Deno.openKv(config.PREFER_FILE);
