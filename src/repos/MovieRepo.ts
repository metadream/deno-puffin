import { Component } from "../helpers/deps.ts";
import { db } from "../helpers/utils.ts";
import { Condition, Movie } from "../helpers/types.ts";

/**
 * 电影元数据数据库
 * @Author metadream
 * @Since 2023-09-09
 */
@Component
export class MovieRepo {
    // 初始化建表
    constructor() {
        db.exec(`CREATE TABLE IF NOT EXISTS movie (
            id          TEXT    NOT NULL    PRIMARY KEY,
            code        TEXT    NOT NULL    UNIQUE  COLLATE NOCASE,
            title       TEXT    NOT NULL            COLLATE NOCASE,
            videoPath   TEXT    NOT NULL    UNIQUE,
            videoSize   REAL    NOT NULL    DEFAULT 0,
            videoWidth  REAL    NOT NULL    DEFAULT 0,
            videoHeight REAL    NOT NULL    DEFAULT 0,
            duration    REAL    NOT NULL    DEFAULT 0,
            rDate       DATE,
            producer    TEXT    COLLATE NOCASE,
            director    TEXT    COLLATE NOCASE,
            region      TEXT    COLLATE NOCASE,
            quality     TEXT    COLLATE NOCASE,
            censorship  TEXT    COLLATE NOCASE,
            rating      TEXT    COLLATE NOCASE,
            series      TEXT    COLLATE NOCASE,
            genres      TEXT    COLLATE NOCASE,
            starring    TEXT    COLLATE NOCASE,
            starred     BOOLEAN NOT NULL DEFAULT FALSE
        )`);
    }

    // 根据条件查询多条记录
    search(condition: Condition, pageSize: number, offset: number): Movie[] {
        const cond = Object.assign({}, condition);
        let sql = "SELECT * FROM movie WHERE 1 = 1";
        sql += this.buildConditionSql(cond);
        sql += ` ORDER BY rDate DESC LIMIT ${pageSize} OFFSET ${offset}`;
        return db.prepare(sql).all<Movie>(cond);
    }

    // 根据条件查询总记录数
    count(condition: Condition): number {
        const cond = Object.assign({}, condition);
        let sql = "SELECT count(1) as count FROM movie WHERE 1 = 1";
        sql += this.buildConditionSql(cond);
        const record = db.prepare(sql).get(cond);
        return record ? record.count as number : 0;
    }

    // 根据ID查询单条记录
    get(id: string): Movie | undefined {
        const stmt = db.prepare(`SELECT * FROM movie WHERE id = ?`);
        return stmt.get<Movie>(id);
    }

    // 根据编号查询单条记录
    query(code: string): Movie | undefined {
        const stmt = db.prepare(`SELECT * FROM movie WHERE code = ?`);
        return stmt.get<Movie>(code);
    }

    // 查询所有记录
    queryAll(): Movie[] {
        const stmt = db.prepare(`SELECT * FROM movie`);
        return stmt.all<Movie>();
    }

    // 批量添加记录（视频路径相同则忽略）
    insert(movies: Movie[]): number {
        const stmt = db.prepare(
            `INSERT OR IGNORE INTO movie (id, code, title, videoPath, videoSize, rDate)
            VALUES (:id, :code, :title, :videoPath, :videoSize, :rDate)`,
        );

        let count = 0;
        const runTransaction = db.transaction((_movies: Movie[]) => {
            for (const _movie of _movies) {
                count += stmt.run(_movie);
            }
        });
        runTransaction(movies);
        return count;
    }

    // 批量删除记录
    delete(ids: string[]): number {
        const stmt = db.prepare(`DELETE FROM movie WHERE id = :id`);
        let count = 0;
        const runTransaction = db.transaction((_ids) => {
            for (const _id of _ids) {
                count += stmt.run(_id);
            }
        });
        runTransaction(ids);
        return count;
    }

    // 更新元数据
    update(movie: Movie): number {
        const stmt = db.prepare(
            `UPDATE movie SET code = :code, title = :title, videoPath = :videoPath, rDate = :rDate
            , videoSize = :videoSize, videoWidth = :videoWidth, videoHeight = :videoHeight, duration = :duration
            , producer = :producer, director = :director, region = :region, quality = :quality
            , censorship = :censorship, rating = :rating, series = :series, genres = :genres
            , starring = :starring, starred = :starred WHERE id = :id`,
        );
        return stmt.run(movie);
    }

    // 构建条件语句
    private buildConditionSql(condition: Condition): string {
        let sql = "";
        if (condition.q) {
            condition.q = `%${condition.q}%`;
            sql += ` AND (1 <> 1`;
            sql += ` OR code like :q`;
            sql += ` OR title like :q`;
            sql += ` OR producer like :q`;
            sql += ` OR director like :q`;
            sql += ` OR series like :q`;
            sql += ` OR genres like :q`;
            sql += ` OR starring like :q`;
            sql += `)`;
        } else if (condition.producer) {
            sql += ` AND producer = :producer`;
        } else if (condition.director) {
            sql += ` AND director = :director`;
        } else if (condition.region) {
            sql += ` AND region = :region`;
        } else if (condition.quality) {
            sql += ` AND quality = :quality`;
        } else if (condition.censorship) {
            sql += ` AND censorship = :censorship`;
        } else if (condition.rating) {
            sql += ` AND rating = :rating`;
        } else if (condition.series) {
            sql += ` AND series = :series`;
        } else if (condition.genres) {
            condition.genres = `%, ${condition.genres},%`;
            sql += ` AND ', ' || genres || ',' like :genres`;
        } else if (condition.starring) {
            condition.starring = `%, ${condition.starring},%`;
            sql += ` AND ', ' || starring || ',' like :starring`;
        } else if (condition.starred) {
            sql += ` AND starred = :starred`;
        }
        return sql;
    }
}
