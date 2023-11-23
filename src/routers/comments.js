import express from "express";

import * as authware from "../middleware/authware.js";
import * as commentController from "../controllers/commentController.js";

const router = express.Router();

router.get("/:comment_id", commentController.get_comment);

router.get("/:comment_id/like", commentController.get_comment_likes);

router.post(
    "/:comment_id/like",
    authware.verifyToken,
    authware.checkLike,
    commentController.post_comment_like
);

router.patch("/:comment_id", authware.verifyToken, commentController.patch_comment);

router.delete("/:comment_id", authware.verifyToken, commentController.delete_comment);

router.delete("/:comment_id/like", authware.verifyToken, commentController.delete_comment_like);

export default router;
