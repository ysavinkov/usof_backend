import jwt from "jsonwebtoken";
import { User, UserRole } from "../models/user.entity.js";
import { LikeType } from "../models/like.entity.js";
import { Status } from "../models/post.entity.js";

import ApiError from "../error/ApiError.js";

export function verifyToken(req, res, next) {
    const token = req.cookies.accessToken;
    if (!token) {
        return res.status(401).json({ message: "Missing token" });
    }
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.clearCookie("accessToken");
        return res.status(401).json({ message: "Unauthorized" });
    }
}

export const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findOne({ where: { email: req.user.email, role: UserRole.ADMIN } });
        if (!user) {
            return next(ApiError.forbidden("Access denied!"));
        }
        next();
    } catch (error) {
        return next(ApiError.internal(error.message));
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
            return next(ApiError.forbidden("Login is already in use"));
        }
        // Email
        user = await User.findOne({
            where: {
                email: req.body.email,
            },
        });
        if (user) {
            return next(ApiError.forbidden("Email is already in use"));
        }
        next();
    } catch (error) {
        return next(ApiError.internal("Unable to validate login or email"));
    }
};

export const checkInput = async (req, res, next) => {
    try {
        if (!req.body.email || !req.body.password || !req.body.login) {
            return next(ApiError.badRequest("Missing requiered data"));
        }
        if (!/^[a-zA-Z0-9]{5,32}$/.test(req.body.login)) {
            return next(
                ApiError.badRequest(
                    "Login is invalid. It must be 5 to 32 characters long and do not contain spaces and symbols"
                )
            );
        }
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(req.body.email)) {
            return next(ApiError.badRequest("Email is invalid. Enter a valid email address"));
        }
        if (req.body.password.length < 8) {
            return next(ApiError.badRequest("Password must be at least 8 symbols long"));
        }
        next();
    } catch (error) {
        return next(ApiError.internal("Unable to validate login or email"));
    }
};

export const checkRole = (req, res, next) => {
    if (req.body.role) {
        if (!Object.values(UserRole).includes(req.body.role)) {
            return res.status(404).json({
                message: `Failed! Role '${req.body.role}' does not exist`,
            });
        }
    }

    next();
};

export const checkLike = (req, res, next) => {
    if (req.body.type) {
        if (!Object.values(LikeType).includes(req.body.type)) {
            return res.status(404).json({
                message: `Failed! Like type '${req.body.type}' does not exist`,
            });
        }
    }

    next();
};

export const checkStatus = (req, res, next) => {
    if (req.body.status) {
        if (!Object.values(Status).includes(req.body.status)) {
            return res.status(404).json({
                message: `Failed! Status type '${req.body.status}' does not exist`,
            });
        }
    }

    next();
};
