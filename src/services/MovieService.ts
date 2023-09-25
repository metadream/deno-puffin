import config from "../helpers/config.ts";
import { Autowired, base64Decode, Component, delay, formatDate, fs, paginate, path } from "../helpers/deps.ts";
import { nanoid } from "../helpers/utils.ts";
import { Condition, Movie, ScanStatus } from "../helpers/types.ts";
import { MovieRepo } from "../repos/MovieRepo.ts";
import { SettingService } from "./SettingService.ts";
import { ffmpeg } from "../helpers/ffmpeg.ts";

/**
 * 电影元数据服务
 * @Author metadream
 * @Since 2023-09-09
 */
@Component
export class MovieService {
    @Autowired
    settingService!: SettingService;
    @Autowired
    movieRepo!: MovieRepo;

    // 异步错误
    private rejectionError?: Error;
    // 扫描状态
    private scanStatus: ScanStatus = {
        totalFiles: 0,
        totalMovies: 0,
        deleted: 0,
        inserted: 0,
        processed: 0,
        completed: true,
    };

    // 根据条件分页列出所有电影
    search(condition: Condition) {
        const pageIndex = condition.p as number || 1;
        delete condition.p;

        const totalRecords = this.movieRepo.count(condition);
        const pager = paginate(totalRecords, config.PAGE_SIZE, pageIndex);
        const movies = this.movieRepo.search(condition, config.PAGE_SIZE, pager.startIndex);
        return { pager, movies };
    }

    // 根据ID获取电影
    get(id: string): Movie | undefined {
        return this.movieRepo.get(id);
    }

    // 根据编号获取电影
    getMovie(code: string): Movie | undefined {
        return this.movieRepo.query(decodeURI(code));
    }

    // 修改电影元数据
    async update(movie: Movie): Promise<number> {
        if (!movie.id) throw "ID不能为空";
        if (!movie.code) throw "编号不能为空";
        if (!movie.title) throw "标题不能为空";

        const _movie = this.movieRepo.query(movie.code);
        if (_movie && _movie.id !== movie.id) {
            throw { status: 500, message: "已存在相同编号的记录" };
        }

        // 格式化主演和类型
        if (movie.starring) movie.starring = movie.starring.replace(/\s*[,，]\s*/g, ", ");
        if (movie.genres) movie.genres = movie.genres.replace(/\s*[,，]\s*/g, ", ");

        // 构建新的文件名
        const oldPath = movie.videoPath;
        const newPath = path.join(path.dirname(oldPath), movie.code) + path.extname(oldPath);
        const isCodify = await this.settingService.isCodify();
        if (isCodify) movie.videoPath = newPath;

        // 上传封面图片
        let image = movie.coverImageData;
        delete movie.coverImageData;
        if (image) {
            image = image.replace(/^data:image\/[a-z]+;base64,/, "");
            Deno.writeFileSync(path.join(config.COVER_HOME, movie.id), base64Decode(image));
        }

        // 保存元数据
        const result = this.movieRepo.update(movie);
        // 重命名文件
        if (isCodify) Deno.renameSync(oldPath, newPath);
        return result;
    }

    // 获取扫描状态
    status(): ScanStatus {
        const error = this.rejectionError;
        if (error) {
            this.rejectionError = undefined;
            throw error;
        }
        return this.scanStatus;
    }

    // 清理元数据、扫描媒体库、生成封面
    async scan(): Promise<void> {
        if (!this.scanStatus.completed) return;
        this.scanStatus.completed = false;

        await this.purgeMetadata();
        await this.scanLibrary();
        this.genCovers().then(() => {
            this.scanStatus.completed = true;
        }).catch((e) => {
            this.scanStatus.completed = true;
            this.rejectionError = e;
            throw e;
        });
    }

    // 清除视频路径对应文件不存在的元数据
    private async purgeMetadata(): Promise<void> {
        const movies = this.movieRepo.queryAll();
        const library = await this.settingService.getLibrary();

        const ids = [];
        for (const movie of movies) {
            if (!movie.videoPath.startsWith(library)) {
                ids.push(movie.id);
            } else if (!fs.existsSync(movie.videoPath)) {
                ids.push(movie.id);
            }
        }
        this.scanStatus.deleted = this.movieRepo.delete(ids);
    }

    // 截取视频帧生成封面
    private async genCovers(): Promise<void> {
        this.scanStatus.processed = 0;
        const movies = this.movieRepo.queryAll();

        for (const movie of movies) {
            const coverPath = path.join(config.COVER_HOME, movie.id);
            if (fs.existsSync(coverPath)) continue;

            // 更新媒体信息
            const mediaInfo = ffmpeg.getMediaInfo(movie.videoPath);
            if (mediaInfo.duration && mediaInfo.video) {
                movie.videoWidth = mediaInfo.video.width;
                movie.videoHeight = mediaInfo.video.height;
                movie.duration = Math.trunc(mediaInfo.duration * 1000);
                this.movieRepo.update(movie);
            }

            // 截取封面
            ffmpeg.capture(movie.videoPath, coverPath, mediaInfo.duration);
            this.scanStatus.processed++;
            await delay(100);
        }
    }

    // 扫描媒体库获取文件元数据
    private async scanLibrary(): Promise<void> {
        const library = await this.settingService.getLibrary();
        const files = fs.walkSync(library);
        const movies: Movie[] = [];
        this.scanStatus.totalFiles = 0;

        for (const file of files) {
            if (!file.isFile) continue;
            this.scanStatus.totalFiles++;
            if (!this.isMedia(file.name)) continue;

            const info = Deno.statSync(file.path);
            const mtime = info.mtime || new Date();
            const name = file.name.replace(/\.[^.]+$/, "");
            const id = nanoid();

            movies.push({
                id,
                code: id,
                title: name,
                videoPath: file.path,
                videoSize: info.size,
                rDate: formatDate(mtime, "yyyy-MM-dd"),
            });
        }

        this.scanStatus.totalMovies = movies.length;
        this.scanStatus.inserted = this.movieRepo.insert(movies);
    }

    // 判断文件名是否属于视频媒体
    private isMedia(fileName: string): boolean {
        return config.VIDEO_FILE_FORMATS.includes(path.extname(fileName));
    }
}
