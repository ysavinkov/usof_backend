import AdminJS from "adminjs";
import AdminJSExpress from "@adminjs/express";
import express from "express";
import Connect from "express-mysql-session";
import session from "express-session";
import fileUpload from "express-fileupload";
import cors from "cors";

import cookieParser from "cookie-parser";

import argon2 from "argon2";
import passwordFeature from "@adminjs/passwords";
import { componentLoader } from "./components.js";

import * as AdminJSSequelize from "@adminjs/sequelize";
import sequelize from "./connect.js";

import { User, UserRole, defaultAdminUser } from "./models/user.entity.js";
import { Post } from "./models/post.entity.js";
import { Category } from "./models/category.entity.js";
import { PostCategory } from "./models/post_category.entity.js";
import { Comment } from "./models/comment.entity.js";
import { PostLike, CommentLike } from "./models/like.entity.js";

import auth from "./routers/auth.js";
import users from "./routers/users.js";
import posts from "./routers/posts.js";
import categories from "./routers/categories.js";
import comments from "./routers/comments.js";

AdminJS.registerAdapter({
    Resource: AdminJSSequelize.Resource,
    Database: AdminJSSequelize.Database,
});

const corsOptions = {
    // address of front
    origin: "http://localhost:3001",
    credentials: true,
};

const PORT = process.env.PORT || 3000;
const IP = process.env.IP || "localhost";

const IN_PROD = process.env.NODE_ENV === "production";
const TWO_HOURS = 1000 * 60 * 60 * 2;

const options = {
    connectionLimit: 10,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    createDatabaseTable: true,
};

const authenticate = async (email: string, password: string) => {
    const admin = await User.findOne({
        where: { email: email, role: UserRole.ADMIN, verified: true },
    });

    // @ts-ignore
    if (admin && (await argon2.verify(admin.password, password))) {
        return Promise.resolve(admin);
    }
    return null;
};

const start = async () => {
    const app = express();

    const adminOptions = {
        componentLoader,
        resources: [
            {
                resource: User,
                options: {
                    properties: {
                        password: { isVisible: false },
                    },
                },
                features: [
                    passwordFeature({
                        componentLoader,
                        properties: {
                            encryptedPassword: "password",
                            password: "newPassword",
                        },
                        hash: argon2.hash,
                    }),
                ],
            },
            Category,
            Post,
            PostLike,
            PostCategory,
            Comment,
            CommentLike,
        ],
    };

    const admin = new AdminJS(adminOptions);

    const ConnectSession = Connect(session);
    const sessionStore = new ConnectSession(options);

    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
        admin,
        {
            authenticate,
            cookieName: "adminjs",
            cookiePassword: "sessionsecret",
        },
        null,
        {
            store: sessionStore,
            resave: true,
            saveUninitialized: true,
            secret: "sessionsecret",
            cookie: {
                httpOnly: IN_PROD,
                secure: IN_PROD,
                maxAge: TWO_HOURS,
            },
            name: "adminjs",
        }
    );
    app.use(admin.options.rootPath, adminRouter);

    app.use(cors(corsOptions));
    app.use(cookieParser());
    app.use(express.json());
    app.use(fileUpload());

    app.use("/api/auth", auth);
    app.use("/api/users", users);
    app.use("/api/posts", posts);
    app.use("/api/categories", categories);
    app.use("/api/comments", comments);

    try {
        app.listen(PORT, () => {
            console.log(`AdminJS started on http://${IP}:${PORT}${admin.options.rootPath}`);
        });
    } catch (error) {
        console.error("Error starting the server:", error);
    }
};

(async () => {
    let toAlter: boolean = false;

    await User.sync({ alter: toAlter });
    await User.findOrCreate({
        where: {
            email: defaultAdminUser.email,
            role: defaultAdminUser.role,
        },
        defaults: {
            login: defaultAdminUser.login,
            password: defaultAdminUser.password,
            verified: true,
        },
    });

    await Post.sync({ alter: toAlter });
    await PostLike.sync({ alter: toAlter });

    await Category.sync({ alter: toAlter });
    await PostCategory.sync({ alter: toAlter });

    await Comment.sync({ alter: toAlter });
    await CommentLike.sync({ alter: toAlter });

    await sequelize.query("DROP TRIGGER IF EXISTS posts_like_insert_trigger; ");
    await sequelize.query(
        "CREATE TRIGGER posts_like_insert_trigger " +
            "AFTER INSERT ON posts_likes " +
            "FOR EACH ROW " +
            "BEGIN " +
            "DECLARE post_author_id INT; " +
            "DECLARE post_like_id INT; " +
            "SELECT author_id INTO post_author_id FROM posts WHERE posts.post_id = NEW.post_id; " +
            "SELECT post_id INTO post_like_id FROM posts WHERE posts.post_id = NEW.post_id; " +
            "IF NEW.type = 'LIKE' THEN " +
            "UPDATE users SET rating = rating + 1 WHERE user_id = post_author_id AND user_id != NEW.author_id; " +
            "UPDATE posts SET rating = rating + 1 WHERE author_id = post_author_id AND author_id != NEW.author_id AND post_like_id = post_id; " +
            "ELSE " +
            "UPDATE users SET rating = rating - 1 WHERE user_id = post_author_id AND user_id != NEW.author_id; " +
            "UPDATE posts SET rating = rating - 1 WHERE author_id = post_author_id AND author_id != NEW.author_id AND post_like_id = post_id; " +
            "END IF; " +
            "END;"
    );

    await sequelize.query("DROP TRIGGER IF EXISTS post_like_delete_trigger; ");
    await sequelize.query(
        "CREATE TRIGGER post_like_delete_trigger " +
            "AFTER DELETE ON posts_likes " +
            "FOR EACH ROW " +
            "BEGIN " +
            "DECLARE post_author_id INT; " +
            "DECLARE post_like_id INT; " +
            "SELECT author_id INTO post_author_id FROM posts WHERE posts.post_id = OLD.post_id; " +
            "SELECT post_id INTO post_like_id FROM posts WHERE posts.post_id = OLD.post_id; " +
            "IF OLD.type = 'LIKE' THEN " +
            "UPDATE users SET rating = rating - 1 WHERE user_id = post_author_id AND user_id != OLD.author_id; " +
            "UPDATE posts SET rating = rating - 1 WHERE author_id = post_author_id AND author_id != OLD.author_id AND post_like_id = post_id; " +
            "ELSE " +
            "UPDATE users SET rating = rating + 1 WHERE user_id = post_author_id AND user_id != OLD.author_id; " +
            "UPDATE posts SET rating = rating + 1 WHERE author_id = post_author_id AND author_id != OLD.author_id AND post_like_id = post_id; " +
            "END IF; " +
            "END;"
    );

    await sequelize.query("DROP TRIGGER IF EXISTS comments_like_insert_trigger; ");
    await sequelize.query(
        "CREATE TRIGGER comments_like_insert_trigger " +
            "AFTER INSERT ON comments_likes " +
            "FOR EACH ROW " +
            "BEGIN " +
            "DECLARE comment_author_id INT; " +
            "DECLARE comment_like_id INT; " +
            "SELECT author_id INTO comment_author_id FROM comments WHERE comments.comment_id = NEW.comment_id; " +
            "SELECT comment_id INTO comment_like_id FROM comments WHERE comments.comment_id = NEW.comment_id; " +
            "IF NEW.type = 'LIKE' THEN " +
            "UPDATE users SET rating = rating + 1 WHERE user_id = comment_author_id AND user_id != NEW.author_id; " +
            "UPDATE comments SET rating = rating + 1 WHERE author_id = comment_author_id AND author_id != NEW.author_id AND comment_like_id = comment_id; " +
            "ELSE " +
            "UPDATE users SET rating = rating - 1 WHERE user_id = comment_author_id AND user_id != NEW.author_id; " +
            "UPDATE comments SET rating = rating - 1 WHERE author_id = comment_author_id AND author_id != NEW.author_id AND comment_like_id = comment_id; " +
            "END IF; " +
            "END;"
    );

    await sequelize.query("DROP TRIGGER IF EXISTS comment_like_delete_trigger; ");
    await sequelize.query(
        "CREATE TRIGGER comment_like_delete_trigger " +
            "AFTER DELETE ON comments_likes " +
            "FOR EACH ROW " +
            "BEGIN " +
            "DECLARE comment_author_id INT; " +
            "DECLARE comment_like_id INT; " +
            "SELECT author_id INTO comment_author_id FROM comments WHERE comments.comment_id = OLD.comment_id; " +
            "SELECT comment_id INTO comment_like_id FROM comments WHERE comments.comment_id = OLD.comment_id; " +
            "IF OLD.type = 'LIKE' THEN " +
            "UPDATE users SET rating = rating - 1 WHERE user_id = comment_author_id AND user_id != OLD.author_id; " +
            "UPDATE comments SET rating = rating - 1 WHERE author_id = comment_author_id AND author_id != OLD.author_id AND comment_like_id = comment_id; " +
            "ELSE " +
            "UPDATE users SET rating = rating + 1 WHERE user_id = comment_author_id AND user_id != OLD.author_id; " +
            "UPDATE comments SET rating = rating + 1 WHERE author_id = comment_author_id AND author_id != OLD.author_id AND comment_like_id = comment_id; " +
            "END IF; " +
            "END;"
    );

    await start();
})();
