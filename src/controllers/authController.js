import argon2 from "argon2";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import { User } from "../models/user.entity.js";

import ApiError from "../error/ApiError.js";

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

async function wrapedSendMail(mailOptions) {
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log("Error sending email: " + error);
                reject(new Error("Error sending email: " + error));
            } else {
                console.log("Email sent: " + info.response);
                resolve(true);
            }
        });
    });
}

function sendMail(mailOptions) {
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log("Email sent: " + info.response);
        }
    });
}

function generateVerification(e_mail, new_password, endpoint) {
    let date = new Date();
    let mail = {
        email: e_mail,
        new_pass: new_password,
        created: date.toString(),
    };

    const mail_token = jwt.sign(mail, process.env.MAIL_TOKEN_SECRET, { expiresIn: "1d" });

    const url = process.env.FRONT_END + "/" + endpoint + "/" + mail_token;

    return url;
}

export const checkWho = async (req, res, next) => {
    try {
        const decoded = jwt.verify(req.cookies.accessToken, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded;
        res.status(200).json(req.user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const register = async (req, res, next) => {
    if (req.body.password !== req.body.confirmPassword) {
        return next(ApiError.badRequest("Passwords do not match"));
    }
    try {
        const newUser = await User.create({
            login: req.body.login,
            email: req.body.email,
            password: await argon2.hash(req.body.password),
            profile_pic: req.body.login + ".jpg",
        });

        const verificationUrl = generateVerification(newUser.email, "", "register");

        let mailOptions = {
            from: process.env.MAIL_USER,
            to: req.body.email,
            subject: "USOF Registration",
            text: "Click on the link to verify your account " + verificationUrl,
            html: "Click on the link to verify your account <br>" + verificationUrl,
        };

        // if (!(await wrapedSendMail(mailOptions))) {
        //     return next(ApiError.internal("Email sending error"));
        // }

        sendMail(mailOptions);

        res.status(200).json({
            message: "Email verification request was sent! Check your mailbox!",
        });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const login = async (req, res, next) => {
    try {
        const user = {
            login: req.body.login,
            email: req.body.email,
        };

        const userInDb = await User.findOne({
            where: {
                login: req.body.login,
                email: req.body.email,
            },
        });

        if (!userInDb) {
            return next(ApiError.badRequest("User not found"));
        } else {
            user.user_id = userInDb.user_id;
            user.role = userInDb.role;
        }

        const passwordIsValid = await argon2.verify(userInDb.password, req.body.password);
        if (!passwordIsValid) {
            return next(ApiError.badRequest("Invalid Password"));
        }

        if (!userInDb.verified) {
            return next(ApiError.forbidden("Email is not verified! Check your mailbox!"));
        }

        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "2h" });

        res.cookie("accessToken", accessToken, { httpOnly: true, expiresIn: "2h" });

        return res.status(200).json({ accessToken: accessToken });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const logout = async (req, res, next) => {
    try {
        res.clearCookie("accessToken");
        res.status(200).json({ message: "Logged out successfuly!" });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const password_reset = async (req, res, next) => {
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(req.body.email)) {
        return next(ApiError.badRequest("Email is invalid. Enter a valid email address"));
    }
    if (!req.body.newPassword) {
        return next(ApiError.badRequest("Password is missing!"));
    }
    if (req.body.newPassword.length < 8) {
        return next(ApiError.badRequest("Password must be at least 8 symbols long"));
    }
    try {
        const user = await User.findOne({
            where: { email: req.body.email },
        });

        if (!user) {
            return next(ApiError.badRequest("User with this email does not exist"));
        }

        const newPassword = await argon2.hash(req.body.newPassword);

        const verificationUrl = generateVerification(req.body.email, newPassword, "password-reset");

        let mailOptions = {
            from: process.env.MAIL_USER,
            to: req.body.email,
            subject: "USOF Reset Password",
            text: "Click on the link to confirm your new password " + verificationUrl,
            html: "Click on the link to confirm your new password <br>" + verificationUrl,
        };

        // if (!(await wrapedSendMail(mailOptions))) {
        //     return next(ApiError.internal("Email sending error"));
        // }

        sendMail(mailOptions);

        res.status(200).json({ message: "Password change request was sent! Check your mailbox!" });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const password_confirm = async (req, res, next) => {
    const token = req.params.confirm_token;

    let email;
    let newPassword;

    if (token) {
        try {
            jwt.verify(token, process.env.MAIL_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return next(ApiError.forbidden(err.message));
                } else {
                    email = decoded.email;
                    newPassword = decoded.new_pass;
                }
            });
        } catch (error) {
            return next(ApiError.forbidden(error.message));
        }
    } else {
        return next(ApiError.forbidden("Access denied"));
    }

    try {
        await User.update({ password: newPassword }, { where: { email: email } });
        res.clearCookie("accessToken");
        return res.status(200).json({ message: "Password was successfully changed!" });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const verify_email = async (req, res, next) => {
    const token = req.params.confirm_token;

    let email;

    if (token) {
        try {
            jwt.verify(token, process.env.MAIL_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return next(ApiError.forbidden(err.message));
                } else {
                    email = decoded.email;
                }
            });
        } catch (error) {
            return next(ApiError.forbidden(error.message));
        }
    } else {
        return next(ApiError.forbidden("Access denied"));
    }

    try {
        await User.update({ verified: true }, { where: { email: email } });
        return res.status(200).json({ message: "Email was successfully verified!" });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};
