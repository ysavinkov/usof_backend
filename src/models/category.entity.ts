import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../connect.js";

interface ICategory {
    category_id: number;
    title: string;
    description: string;
}

export type CategoryCreationAttributes = Optional<ICategory, "category_id">;

export class Category extends Model<ICategory, CategoryCreationAttributes> {
    declare ICategory;
}

Category.init(
    {
        category_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        title: {
            type: new DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        description: {
            type: new DataTypes.STRING(300),
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: "categories",
        modelName: process.env.DB_NAME,
        timestamps: false,
    }
);
