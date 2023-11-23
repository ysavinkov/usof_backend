import express from "express";

import * as authware from "../middleware/authware.js";
import * as postController from "../controllers/postController.js";

const router = express.Router();

router.get("/", postController.get_posts);

router.get("/:post_id", postController.get_post);

router.get("/:post_id/comments", postController.get_comments);

router.post("/:post_id/comments", authware.verifyToken, postController.post_comments);

router.get("/:post_id/categories", postController.get_categories);

router.get("/:post_id/like", postController.get_likes);

router.post("/", authware.verifyToken, postController.post_post);

router.post("/:post_id/like", authware.verifyToken, authware.checkLike, postController.post_like);

router.patch("/:post_id", authware.verifyToken, authware.checkStatus, postController.patch_post);

router.delete("/:post_id", authware.verifyToken, postController.delete_post);

router.delete("/:post_id/like", authware.verifyToken, postController.delete_like);

export default router;
