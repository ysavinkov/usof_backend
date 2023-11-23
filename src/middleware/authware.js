import jwt from "jsonwebtoken";
import { User, UserRole } from "../models/user.entity.js";
import { LikeType } from "../models/like.entity.js";
import { Status } from "../models/post.entity.js";

export function verifyToken(req, res, next) {
    const token = req.cookies.accessToken;
    try {
        const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = user;
        next();
    } catch (error) {
        res.clearCookie("accessToken");
        return res.status(401).send({ message: error.message });
    }
}

export const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findOne({ where: { email: req.user.email, role: UserRole.ADMIN } });
        if (!user) {
            return res.status(403).send({ message: "Access denied!" });
        }
        next();
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

export const checkLoginAndEmail = async (req, res, next) => {
    try {
        // Username
        let user = await User.findOne({
            where: {
                login: req.body.login,
            },
        });
        if (user) {
            return res.status(403).send({
                message: "Failed! Login is already in use!",
            });
        }
        // Email
        user = await User.findOne({
            where: {
                email: req.body.email,
            },
        });
        if (user) {
            return res.status(403).send({
                message: "Failed! Email is already in use!",
            });
        }
        next();
    } catch (error) {
        return res.status(500).send({
            message: "Unable to validate login or email!",
        });
    }
};

export const checkRole = (req, res, next) => {
    if (req.body.role) {
        if (!Object.values(UserRole).includes(req.body.role)) {
            return res.status(400).send({
                message: `Failed! Role '${req.body.role}' does not exist`,
            });
        }
    }

    next();
};

export const checkLike = (req, res, next) => {
    if (req.body.type) {
        if (!Object.values(LikeType).includes(req.body.type)) {
            return res.status(400).send({
                message: `Failed! Like type '${req.body.type}' does not exist`,
            });
        }
    }

    next();
};

export const checkStatus = (req, res, next) => {
    if (req.body.status) {
        if (!Object.values(Status).includes(req.body.status)) {
            return res.status(400).send({
                message: `Failed! Status type '${req.body.status}' does not exist`,
            });
        }
    }

    next();
};
