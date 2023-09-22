import config from "../helpers/config.ts";
import { Autowired, Component, delay, fs, path } from "../helpers/deps.ts";
import { ffmpeg } from "../helpers/ffmpeg.ts";
import { MovieService } from "./MovieService.ts";

/**
 * 电影封面服务
 * @Author metadream
 * @Since 2023-09-15
 */
@Component
export class CoverService {
    @Autowired
    movieService!: MovieService;
    private inProcess = false;

    // 获取封面生成状态
    getState(): boolean {
        return this.inProcess;
    }

    // 逐一生成封面
    async generate() {
        if (this.inProcess) return;
        this.inProcess = true;
        const movies = this.movieService.list();
        for (const movie of movies) {
            const coverPath = path.join(config.COVER_HOME, movie.id);
            if (!fs.existsSync(coverPath)) {
                ffmpeg.capture(movie.videoPath, coverPath);
                await delay(100);
            }
        }
        this.inProcess = false;
    }
}
