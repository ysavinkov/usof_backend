import jwt from "jsonwebtoken";
import argon2 from "argon2";
import path from "path";
import fs from "fs";

import { User } from "../models/user.entity.js";

export const get_users = async (req, res) => {
    try {
        const users = await User.findAll();
        return res.status(200).json(users);
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

export const get_user = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.user_id);
        if (!user) {
            res.status(404);
            return res.send({ message: `User with id ${req.params.user_id} not found!` });
        }
        return res.status(200).json(user);
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

export const post_user = async (req, res) => {
    if (req.body.password !== req.body.confirmPassword) {
        return res.status(403).send({ message: "Passwords do not match!" });
    }
    try {
        await User.create({
            login: req.body.login,
            email: req.body.email,
            password: await argon2.hash(req.body.password),
            full_name: req.body.full_name,
            role: req.body.role,
            verified: true,
        });

        return res.status(200).send({ message: "User was created by admin!" });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

export const get_avatar = async (req, res) => {
    const user = await User.findByPk(req.params.user_id);

    if (!user) {
        res.status(404);
        return res.send({ message: `User with id ${req.params.user_id} not found!` });
    }

    const fileName = user.login + ".jpg";
    const __dirname = path.resolve();
    const defaultPath = path.join(__dirname, process.env.DEFAULT_PIC);
    const filePath = path.join(__dirname, process.env.PROFILE_PICS, fileName);

    const fileType = fileName.endsWith(".jpg") ? "image/jpeg" : "Wrong file type";
    if (fileType === "image/jpeg") {
        fs.access(filePath, fs.constants.F_OK, async (err) => {
            if (err) {
                fs.copyFile(defaultPath, filePath, async (err) => {
                    if (err) {
                        return res
                            .status(500)
                            .send({ message: "Error while copying default avatar" });
                    } else {
                        await User.update(
                            {
                                profile_pic: user.login + ".jpg",
                            },
                            { where: { user_id: req.params.user_id } }
                        );

                        return res.status(200).sendFile(filePath);
                    }
                });
            } else {
                await User.update(
                    {
                        profile_pic: user.login + ".jpg",
                    },
                    { where: { user_id: req.params.user_id } }
                );

                return res.status(200).sendFile(filePath);
            }
        });
    } else {
        return res.status(500).send({ message: fileType });
    }
};

export const patch_avatar = async (req, res) => {
    const __dirname = path.resolve();
    let sampleFile;
    let uploadPath;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send({ message: "No files were uploaded." });
    }

    sampleFile = req.files.avatar;
    uploadPath =
        __dirname +
        process.env.PROFILE_PICS +
        req.user.login +
        sampleFile.name.substring(sampleFile.name.length - 4);

    const fileName = sampleFile.name;

    const fileType = fileName.endsWith(".jpg") ? "image/jpeg" : "Wrong file type";

    if (fileType === "image/jpeg") {
        sampleFile.mv(uploadPath, async (err) => {
            if (err) {
                return res.status(500).send(err);
            } else {
                await User.update(
                    {
                        profile_pic: req.user.login + ".jpg",
                    },
                    { where: { login: req.user.login } }
                );
            }

            return res.status(200).send({ message: "File uploaded!" });
        });
    } else {
        return res.status(400).send({ message: fileType });
    }
};

export const patch_user = async (req, res) => {
    if (req.user.user_id != req.params.user_id) {
        return res.send({ message: "Access denied!" });
    }
    try {
        const __dirname = path.resolve();

        const user = await User.update(
            {
                login: req.body.login,
                full_name: req.body.full_name,
                profile_pic: req.body.login + ".jpg",
            },
            { where: { user_id: req.params.user_id } }
        );
        if (!user) {
            res.status(404);
            return res.send({ message: `User with id ${req.params.user_id} not found!` });
        }

        const token = req.cookies.accessToken;

        let userFromToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        userFromToken.login = req.body.login;

        const accessToken = jwt.sign(userFromToken, process.env.ACCESS_TOKEN_SECRET);

        res.cookie("accessToken", accessToken, { httpOnly: true });

        const defaultPath = __dirname + process.env.DEFAULT_PIC;
        const oldPath = __dirname + process.env.PROFILE_PICS + req.user.login + ".jpg";
        const newPath = __dirname + process.env.PROFILE_PICS + req.body.login + ".jpg";

        fs.rename(oldPath, newPath, function (error) {
            if (error) {
                fs.copyFile(defaultPath, newPath, (err) => {
                    if (err) {
                        return res
                            .status(500)
                            .send({ message: "Error while copying default avatar" });
                    }
                });
            }
        });

        return res.status(200).send({ message: "User updated successfully!" });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

export const delete_user = async (req, res) => {
    if (req.user.user_id != req.params.user_id) {
        return res.status(403).send({ message: "Access denied!" });
    }
    try {
        const user = await User.findByPk(req.params.user_id);
        if (!user) {
            res.status(404);
            return res.send({ message: `User with id ${req.params.user_id} not found!` });
        }

        const __dirname = path.resolve();

        fs.unlink(__dirname + process.env.PROFILE_PICS + user.profile_pic, (err) => {
            if (err) {
            }
        });

        await User.destroy({ where: { user_id: req.params.user_id } });

        return res.status(200).send({ message: `User with id ${req.params.user_id} was deleted!` });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};
