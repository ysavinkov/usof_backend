import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../connect.js";

import { User } from "./user.entity.js";
import { Post } from "./post.entity.js";

interface IComment {
    comment_id: number;
    author_id: number;
    post_id: number;
    content: string;
    rating: bigint;
}

export type CommentCreationAttributes = Optional<IComment, "comment_id">;

export class Comment extends Model<IComment, CommentCreationAttributes> {
    declare IComment;
}

Comment.init(
    {
        comment_id: {
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
        content: {
            type: new DataTypes.STRING(500),
            allowNull: false,
        },
        rating: {
            type: new DataTypes.BIGINT(),
            defaultValue: 0,
        },
    },
    {
        sequelize,
        tableName: "comments",
        modelName: process.env.DB_NAME,
        timestamps: true,
    }
);
