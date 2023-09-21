import config from "../helpers/config.ts";
import { Autowired, base64Decode, Component, fs, paginate, path } from "../helpers/deps.ts";
import { nanoid } from "../helpers/utils.ts";
import { Condition, Movie } from "../helpers/types.ts";
import { MovieRepo } from "../repos/MovieRepo.ts";
import { SettingService } from "./SettingService.ts";

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

    // 获取所有电影
    list(): Movie[] {
        return this.movieRepo.queryAll();
    }

    // 修改电影元数据
    async update(movie: Movie): Promise<number> {
        if (!movie.id) throw "ID不能为空";
        if (!movie.code) throw "编号不能为空";
        if (!movie.title) throw "标题不能为空";

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

    // 清除视频路径对应的文件不存在的元数据
    async purge(): Promise<number> {
        const movies = this.list();
        const library = await this.settingService.getLibrary();

        const ids = [];
        for (const movie of movies) {
            if (!movie.videoPath.startsWith(library)) {
                ids.push(movie.id);
            } else if (!fs.existsSync(movie.videoPath)) {
                ids.push(movie.id);
            }
        }
        return this.movieRepo.delete(ids);
    }

    // 扫描配置媒体库中的电影文件生成元数据
    async scan(): Promise<Record<string, number>> {
        const library = await this.settingService.getLibrary();
        const files = fs.walkSync(library);
        const movies: Movie[] = [];
        let totalFiles = 0;

        for (const file of files) {
            if (!file.isFile) continue;
            totalFiles++;
            if (config.VIDEO_FILE_FORMATS.includes(path.extname(file.name))) {
                const info = Deno.statSync(file.path);
                const name = file.name.replace(/\.[^.]+$/, "");
                const id = nanoid();
                movies.push({
                    id,
                    code: id,
                    title: name,
                    videoPath: file.path,
                    videoSize: info.size,
                    createTime: info.mtime,
                });
            }
        }

        const inserted = this.movieRepo.insert(movies);
        return { totalFiles, totalMovies: movies.length, inserted };
    }
}
