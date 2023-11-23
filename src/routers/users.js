import express from "express";

import * as authware from "../middleware/authware.js";
import * as userController from "../controllers/userController.js";

const router = express.Router();

router.get("/", userController.get_users);

router.get("/:user_id", userController.get_user);

router.post(
    "/",
    authware.verifyToken,
    authware.isAdmin,
    authware.checkLoginAndEmail,
    authware.checkRole,
    userController.post_user
);

router.get("/:user_id/avatar", userController.get_avatar);

router.patch("/avatar", authware.verifyToken, userController.patch_avatar);

router.patch("/:user_id", authware.verifyToken, userController.patch_user);

router.delete("/:user_id", authware.verifyToken, userController.delete_user);

export default router;
