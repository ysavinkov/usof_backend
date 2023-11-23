import express from "express";

import * as authware from "../middleware/authware.js";
import * as authController from "../controllers/authController.js";

const router = express.Router();

router.post("/register", authware.checkLoginAndEmail, authController.register);

router.post("/login", authController.login);

router.post("/logout", authController.logout);

router.post("/password-reset", authware.verifyToken, authController.password_reset);

router.get("/password-reset/:confirm_token", authController.password_confirm);

router.get("/verify-email/:confirm_token", authController.verify_email);

export default router;
