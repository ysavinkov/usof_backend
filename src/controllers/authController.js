import argon2 from "argon2";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import { User } from "../models/user.entity.js";

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

function generateVerification(user_id, new_password, endpoint) {
    let date = new Date();
    let mail = {
        id: user_id,
        new_pass: new_password,
        created: date.toString(),
    };

    const mail_token = jwt.sign(mail, process.env.MAIL_TOKEN_SECRET, { expiresIn: "1d" });

    const url =
        "http://" +
        process.env.IP +
        ":" +
        process.env.PORT +
        "/api/auth/" +
        endpoint +
        "/" +
        mail_token;

    return url;
}

export const register = async (req, res) => {
    if (req.body.password !== req.body.confirmPassword) {
        return res.status(403).send({ message: "Passwords do not match!" });
    }
    try {
        const newUser = await User.create({
            login: req.body.login,
            email: req.body.email,
            password: await argon2.hash(req.body.password),
        });

        // const userInDb = await User.findOne({
        //     where: {
        //         login: req.body.login,
        //         email: req.body.email,
        //     },
        // });

        const verificationUrl = generateVerification(newUser.user_id, "", "verify-email");

        let mailOptions = {
            from: process.env.MAIL_USER,
            to: req.body.email,
            subject: "USOF Registration",
            text: "Click on the link to verify your account " + verificationUrl,
            html: "Click on the link to verify your account <br>" + verificationUrl,
        };

        if (!(await wrapedSendMail(mailOptions))) {
            return res.status(500).send("Email sending error");
        }

        res.status(200).send({ message: "User was created! Check your mailbox!" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const login = async (req, res) => {
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
            return res.status(404).send({ message: "User not found." });
        } else {
            user.user_id = userInDb.user_id;
        }

        const passwordIsValid = await argon2.verify(userInDb.password, req.body.password);
        if (!passwordIsValid) {
            return res.status(401).send({
                message: "Invalid Password!",
            });
        }

        if (!userInDb.verified) {
            return res.status(403).send({ message: "User is not verified! Check your mailbox." });
        }

        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "6h" });

        res.cookie("accessToken", accessToken, { httpOnly: true });

        return res.status(200).json({ accessToken: accessToken });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

export const logout = async (req, res) => {
    try {
        res.clearCookie("accessToken");
        res.status(200).send({ message: "Logged out successfuly!" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const password_reset = async (req, res) => {
    if (req.user.email != req.body.email) {
        return res.status(403).send({ message: "Access denied!" });
    }
    if (!req.body.newPassword) {
        return res.status(400).send({ message: "Password is missing!" });
    }
    try {
        const newPassword = await argon2.hash(req.body.newPassword);

        const verificationUrl = generateVerification(
            req.user.user_id,
            newPassword,
            "password-reset"
        );

        let mailOptions = {
            from: process.env.MAIL_USER,
            to: req.body.email,
            subject: "USOF Reset Password",
            text: "Click on the link to confirm your new password " + verificationUrl,
            html: "Click on the link to confirm your new password <br>" + verificationUrl,
        };

        if (!(await wrapedSendMail(mailOptions))) {
            return res.status(500).send("Email sending error");
        }

        res.status(200).send({ message: "Password change request was sent!" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const password_confirm = async (req, res) => {
    const token = req.params.confirm_token;

    let id;
    let newPassword;

    if (token) {
        try {
            jwt.verify(token, process.env.MAIL_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(403).send({ message: err.message });
                } else {
                    id = decoded.id;
                    newPassword = decoded.new_pass;
                }
            });
        } catch (error) {
            return res.status(403).send({ message: error.message });
        }
    } else {
        return res.sendStatus(403);
    }

    try {
        await User.update({ password: newPassword }, { where: { user_id: id } });
        res.clearCookie("accessToken");
        return res.status(200).send({ message: "Password was successfully changed!" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const verify_email = async (req, res) => {
    const token = req.params.confirm_token;

    let id;

    if (token) {
        try {
            jwt.verify(token, process.env.MAIL_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(403).send({ message: err.message });
                } else {
                    id = decoded.id;
                }
            });
        } catch (error) {
            return res.status(403).send({ message: error.message });
        }
    } else {
        return res.sendStatus(403);
    }

    try {
        await User.update({ verified: true }, { where: { user_id: id } });
        return res.status(200).send({ message: "Email was successfully verified!" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
