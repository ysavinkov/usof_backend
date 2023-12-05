import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../connect.js";

import { User } from "./user.entity.js";
import { Post } from "./post.entity.js";
import { Comment } from "./comment.entity.js";

export enum LikeType {
    UP = "LIKE",
    DOWN = "DISLIKE",
}

interface IPostLike {
    like_id: number;
    author_id: number;
    post_id: number;
    type: LikeType;
}

export type PostLikeCreationAttributes = Optional<IPostLike, "like_id">;

export class PostLike extends Model<IPostLike, PostLikeCreationAttributes> {
    declare IPostLike;
}

PostLike.init(
    {
        like_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        author_id: {
            type: DataTypes.INTEGER,
            references: {
                model: User,
                key: "user_id",
            },
            allowNull: false,
            onDelete: "CASCADE",
        },
        post_id: {
            type: DataTypes.INTEGER,
            references: {
                model: Post,
                key: "post_id",
            },
            allowNull: false,
            onDelete: "CASCADE",
        },
        type: {
            type: new DataTypes.ENUM(LikeType.UP, LikeType.DOWN),
            allowNull: false,
            defaultValue: LikeType.UP,
        },
    },
    {
        sequelize,
        tableName: "posts_likes",
        modelName: process.env.DB_NAME,
        timestamps: false,
        indexes: [
            {
                name: "unique_author_and_post",
                unique: true,
                fields: ["author_id", "post_id"],
            },
        ],
    }
);

interface ICommentLike {
    like_id: number;
    author_id: number;
    comment_id: number;
    type: LikeType;
}

export type CommentLikeCreationAttributes = Optional<ICommentLike, "like_id">;

export class CommentLike extends Model<ICommentLike, CommentLikeCreationAttributes> {
    declare ICommentLike;
}

CommentLike.init(
    {
        like_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        author_id: {
            type: DataTypes.INTEGER,
            references: {
                model: User,
                key: "user_id",
            },
            allowNull: false,
            onDelete: "CASCADE",
        },
        comment_id: {
            type: DataTypes.INTEGER,
            references: {
                model: Comment,
                key: "comment_id",
            },
            allowNull: false,
            onDelete: "CASCADE",
        },
        type: {
            type: new DataTypes.ENUM(LikeType.UP, LikeType.DOWN),
            allowNull: false,
            defaultValue: LikeType.UP,
        },
    },
    {
        sequelize,
        tableName: "comments_likes",
        modelName: process.env.DB_NAME,
        timestamps: false,
        indexes: [
            {
                name: "unique_author_and_comment",
                unique: true,
                fields: ["author_id", "comment_id"],
            },
        ],
    }
);
