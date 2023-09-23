export type Condition = Record<string, string | number | boolean | undefined>;

export type User = {
    username: string;
    password: string;
};

export type Preferences = {
    library: string;
    metafields: string[];
    codify: boolean;
};

export type Movie = {
    id: string;
    code: string;
    title: string;
    videoPath: string;
    videoSize: number;
    rDate: string;

    producer?: string;
    director?: string;
    region?: string;
    quality?: string;
    censorship?: string;
    rating?: string;
    genres?: string;
    series?: string;
    starring?: string;
    coverImageData?: string;
    starred?: boolean;
};
