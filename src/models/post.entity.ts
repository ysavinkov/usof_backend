import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../connect.js";

import { User } from "./user.entity.js";

export enum Status {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
}

interface IPost {
    post_id: number;
    title: string;
    author_id: number;
    status: string;
    content: string;
    rating: bigint;
}

export type PostCreationAttributes = Optional<IPost, "post_id">;

export class Post extends Model<IPost, PostCreationAttributes> {
    declare IPost;
}

Post.init(
    {
        post_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        title: {
            type: new DataTypes.STRING(200),
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
        status: {
            type: new DataTypes.ENUM(Status.ACTIVE, Status.INACTIVE),
            allowNull: true,
            defaultValue: Status.ACTIVE,
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
        tableName: "posts",
        modelName: process.env.DB_NAME,
        timestamps: true,
    }
);
