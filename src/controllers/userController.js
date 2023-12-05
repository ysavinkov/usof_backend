import jwt from "jsonwebtoken";
import argon2 from "argon2";
import path from "path";
import fs from "fs";

import { User, UserRole } from "../models/user.entity.js";

import ApiError from "../error/ApiError.js";

export const get_users = async (req, res, next) => {
    try {
        const sortBy = "rating";
        const sortOrder = "DESC";

        const users = await User.findAll({
            order: [[sortBy, sortOrder]],
        });
        return res.status(200).json(users);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const get_user = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.user_id);
        if (!user) {
            return next(ApiError.badRequest(`User with id ${req.params.user_id} not found!`));
        }
        return res.status(200).json(user);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const post_user = async (req, res, next) => {
    if (req.body.password !== req.body.confirmPassword) {
        return next(ApiError.badRequest("Passwords do not match"));
    }
    try {
        await User.create({
            login: req.body.login,
            email: req.body.email,
            password: await argon2.hash(req.body.password),
            full_name: req.body.full_name,
            profile_pic: req.body.login + ".jpg",
            role: req.body.role,
            verified: true,
        });

        return res.status(200).json({ message: "User was created by admin!" });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const get_avatar = async (req, res, next) => {
    const user = await User.findByPk(req.params.user_id);

    if (!user) {
        return next(ApiError.badRequest(`User with id ${req.params.user_id} not found!`));
    }

    const fileName = user.profile_pic;
    const __dirname = path.resolve();
    const defaultPath = path.join(__dirname, process.env.DEFAULT_PIC);
    const filePath = path.join(__dirname, process.env.PROFILE_PICS, fileName);

    const fileType = fileName.endsWith(".jpg") ? "image/jpeg" : "Wrong file type";
    if (fileType === "image/jpeg") {
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                fs.copyFile(defaultPath, filePath, (err) => {
                    if (err) {
                        return next(ApiError.internal("Error while copying default avatar"));
                    } else {
                        return res.status(200).sendFile(filePath);
                    }
                });
            } else {
                return res.status(200).sendFile(filePath);
            }
        });
    } else {
        return next(ApiError.badRequest(fileType));
    }
};

export const patch_avatar = async (req, res, next) => {
    const __dirname = path.resolve();
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return next(ApiError.badRequest("No files were uploaded"));
    }

    const user = await User.findByPk(req.user.user_id);
    if (!user) {
        return next(ApiError.badRequest(`User with id ${req.user.user_id} not found!`));
    }

    sampleFile = req.files.avatar;

    uploadPath =
        __dirname +
        process.env.PROFILE_PICS +
        user.login +
        sampleFile.name.substring(sampleFile.name.length - 4);

    const fileName = sampleFile.name;

    const fileType = fileName.endsWith(".jpg")
        ? "image/jpeg"
        : "Wrong file type! Please upload JPG only.";

    if (fileType === "image/jpeg") {
        sampleFile.mv(uploadPath, async (err) => {
            if (err) {
                return next(ApiError.internal(err));
            } else {
                return res.status(200).json({ message: "Profile updated successfully!" });
            }
        });
    } else {
        return next(ApiError.badRequest(fileType));
    }
};

export const patch_user = async (req, res, next) => {
    if (req.user.user_id == req.params.user_id || req.user.role == UserRole.ADMIN) {
    } else {
        return next(ApiError.forbidden("Access denied"));
    }
    if (!/^[a-zA-Z0-9]{5,32}$/.test(req.body.login)) {
        return next(
            ApiError.badRequest(
                "Login is invalid. It must be 5 to 32 characters long and do not contain spaces and symbols"
            )
        );
    }
    try {
        const __dirname = path.resolve();

        const user = await User.findByPk(req.params.user_id);
        if (!user) {
            return next(ApiError.badRequest(`User with id ${req.params.user_id} not found!`));
        }

        const defaultPath = __dirname + process.env.DEFAULT_PIC;
        const oldPath = __dirname + process.env.PROFILE_PICS + user.profile_pic;
        const newPath = __dirname + process.env.PROFILE_PICS + req.body.login + ".jpg";

        await User.update(
            {
                login: req.body.login,
                full_name: req.body.full_name,
                profile_pic: req.body.login + ".jpg",
            },
            { where: { user_id: req.params.user_id } }
        );

        fs.rename(oldPath, newPath, function (error) {
            if (error) {
                fs.copyFile(defaultPath, newPath, (err) => {
                    if (err) {
                        return next(ApiError.internal("Error while copying default avatar"));
                    }
                });
            }
        });

        return res.status(200).json({ message: "Profile updated successfully!" });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const delete_user = async (req, res, next) => {
    if (req.user.user_id == req.params.user_id || req.user.role == UserRole.ADMIN) {
    } else {
        return next(ApiError.forbidden("Access denied"));
    }
    try {
        const user = await User.findByPk(req.params.user_id);
        if (!user) {
            return next(ApiError.badRequest(`User with id ${req.params.user_id} not found!`));
        }

        const __dirname = path.resolve();

        fs.unlink(__dirname + process.env.PROFILE_PICS + user.profile_pic, (err) => {
            if (err) {
                // if no picture, do nothing
            }
        });

        await User.destroy({ where: { user_id: req.params.user_id } });

        res.clearCookie("accessToken");

        return res.status(200).json({ message: `User with id ${req.params.user_id} was deleted!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};
