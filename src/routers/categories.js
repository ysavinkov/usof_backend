import express from "express";

import * as authware from "../middleware/authware.js";
import * as categoryController from "../controllers/categoryController.js";

const router = express.Router();

router.get("/", categoryController.get_categories);

router.get("/:category_id", categoryController.get_category);

router.get("/:category_id/posts", categoryController.get_posts_with_category);

router.post("/", authware.verifyToken, authware.isAdmin, categoryController.post_category);

router.patch(
    "/:category_id",
    authware.verifyToken,
    authware.isAdmin,
    categoryController.patch_category
);

router.delete(
    "/:category_id",
    authware.verifyToken,
    authware.isAdmin,
    categoryController.delete_category
);

export default router;
