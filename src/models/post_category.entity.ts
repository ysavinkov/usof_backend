import { DataTypes, Model } from "sequelize";

import sequelize from "../connect.js";

import { Category } from "./category.entity.js";
import { Post } from "./post.entity.js";

interface IPostCategory {
    postId: number;
    categoryId: number;
}

export class PostCategory extends Model<IPostCategory> {}

PostCategory.init(
    {
        postId: {
            type: DataTypes.INTEGER,
            references: {
                model: Post,
                key: "post_id",
            },
            allowNull: false,
            onDelete: "CASCADE",
        },
        categoryId: {
            type: DataTypes.INTEGER,
            references: {
                model: Category,
                key: "category_id",
            },
            allowNull: false,
            onDelete: "CASCADE",
        },
    },
    {
        sequelize,
        tableName: "posts_categories",
        modelName: process.env.DB_NAME,
        timestamps: false,
        indexes: [
            {
                name: "unique_post_and_category",
                unique: true,
                fields: ["postId", "categoryId"],
            },
        ],
    }
);

Post.belongsToMany(Category, { through: "PostCategory" });
Category.belongsToMany(Post, { through: "PostCategory" });
