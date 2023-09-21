import { Bootstrap, Server } from "./src/helpers/deps.ts";
import { Attributes } from "./src/middlewares/Attributes.ts";
import { Passport } from "./src/middlewares/Passport.ts";
import { ErrorController } from "./src/middlewares/ErrorController.ts";
import { CoverController } from "./src/controllers/CoverController.ts";
import { MovieController } from "./src/controllers/MovieController.ts";
import { SettingController } from "./src/controllers/SettingController.ts";
import { UserController } from "./src/controllers/UserController.ts";
import { VideoController } from "./src/controllers/VideoController.ts";
import { MovieRepo } from "./src/repos/MovieRepo.ts";
import { SettingRepo } from "./src/repos/SettingRepo.ts";
import { CoverService } from "./src/services/CoverService.ts";
import { MovieService } from "./src/services/MovieService.ts";
import { SettingService } from "./src/services/SettingService.ts";
import { VideoService } from "./src/services/VideoService.ts";

@Bootstrap
export default class {
    constructor(server: Server) {
        server.assets("/assets/*");
        server.views("./views");

        server.modules(
            Attributes,
            Passport,
            ErrorController,
            CoverController,
            MovieController,
            SettingController,
            UserController,
            VideoController,
            MovieRepo,
            SettingRepo,
            CoverService,
            MovieService,
            SettingService,
            VideoService,
        );
    }
}
