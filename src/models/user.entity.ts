import { DataTypes, Model, Optional } from "sequelize";

import sequelize from "../connect.js";
import argon2 from "argon2";

export enum UserRole {
    USER = "USER",
    ADMIN = "ADMIN",
}

export const defaultAdminUser = {
    login: "HeadAdmin",
    password: await argon2.hash("password"),
    email: "admin@example.com",
    role: UserRole.ADMIN,
};

interface IUser {
    user_id: number;
    login: string;
    password: string;
    full_name: string;
    email: string;
    verified: boolean;
    profile_pic: string;
    rating: bigint;
    role: UserRole;
}

export type UserCreationAttributes = Optional<IUser, "user_id">;

export class User extends Model<IUser, UserCreationAttributes> {
    declare IUser;
}

User.init(
    {
        user_id: {
            type: new DataTypes.INTEGER(),
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
        },
        login: {
            type: new DataTypes.STRING(128),
            allowNull: false,
            unique: true,
            validate: {
                len: [5, 128],
                isAlphanumeric: true,
                notEmpty: true,
            },
        },
        password: {
            type: new DataTypes.STRING(255),
            allowNull: false,
            validate: {
                len: [8, 255],
                notEmpty: true,
            },
        },
        full_name: {
            type: new DataTypes.STRING(128),
            defaultValue: "anonymous",
        },
        email: {
            type: new DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        profile_pic: {
            type: new DataTypes.STRING(255),
            defaultValue: `default.jpg`,
        },
        rating: {
            type: new DataTypes.BIGINT(),
            defaultValue: 0,
        },
        role: {
            type: new DataTypes.ENUM(UserRole.USER, UserRole.ADMIN),
            allowNull: false,
            defaultValue: UserRole.USER,
        },
    },
    {
        sequelize,
        tableName: "users",
        modelName: process.env.DB_NAME,
        timestamps: false,
    }
);
