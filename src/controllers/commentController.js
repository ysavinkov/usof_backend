import { Comment } from "../models/comment.entity.js";
import { CommentLike } from "../models/like.entity.js";

export const get_comment = async (req, res) => {
    try {
        const comment = await Comment.findByPk(req.params.comment_id);
        if (!comment) {
            res.status(404);
            return res.send({ message: `Comment with id ${req.params.comment_id} not found!` });
        }
        return res.status(200).json(comment);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const get_comment_likes = async (req, res) => {
    try {
        const comment_likes = await CommentLike.findAll({
            where: {
                comment_id: req.params.comment_id,
            },
        });
        if (comment_likes.length == 0) {
            res.status(404);
            return res.send({
                message: `Likes for comment with id ${req.params.comment_id} not found!`,
            });
        }

        res.status(200).json(comment_likes);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const post_comment_like = async (req, res) => {
    if (!req.body.type) {
        return res.status(400).send("Like type is required!");
    }
    try {
        const comment = await Comment.findByPk(req.params.comment_id);

        if (!comment) {
            res.status(404);
            return res.send({ message: `Comment with id ${req.params.comment_id} not found!` });
        }

        await CommentLike.destroy({
            where: {
                author_id: req.user.user_id,
                comment_id: req.params.comment_id,
            },
        });

        await CommentLike.create({
            author_id: req.user.user_id,
            comment_id: req.params.comment_id,
            type: req.body.type,
        });
        res.status(200).json({ message: `${req.body.type} created successfully!` });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const patch_comment = async (req, res) => {
    if (!req.body.content) {
        return res.status(400).send({ message: "Content is required!" });
    }
    try {
        const checkAuthor = await Comment.findByPk(req.params.comment_id);

        if (checkAuthor.author_id != req.user.user_id) {
            return res.status(403).send({ message: "Access denied!" });
        }

        const comment = await Comment.update(
            {
                content: req.body.content,
            },
            { where: { comment_id: req.params.comment_id } }
        );

        if (!comment) {
            res.status(404);
            return res.send({ message: `Comment with id ${req.params.comment_id} not found!` });
        }

        return res
            .status(200)
            .send({ message: `Comment with id ${req.params.comment_id} was updated!` });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const delete_comment = async (req, res) => {
    try {
        const checkAuthor = await Comment.findByPk(req.params.comment_id);

        if (checkAuthor.author_id != req.user.user_id) {
            return res.status(403).send({ message: "Access denied!" });
        }

        const comment = await Comment.destroy({ where: { comment_id: req.params.comment_id } });
        if (!comment) {
            res.status(404);
            return res.send({ message: `Comment with id ${req.params.comment_id} not found!` });
        }

        return res
            .status(200)
            .send({ message: `Comment with id ${req.params.comment_id} was deleted!` });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

export const delete_comment_like = async (req, res) => {
    try {
        const comment = await Comment.findByPk(req.params.comment_id);

        if (!comment) {
            res.status(404);
            return res.send({ message: `Comment with id ${req.params.comment_id} not found!` });
        }

        const comment_like = await CommentLike.destroy({
            where: {
                author_id: req.user.user_id,
                comment_id: req.params.comment_id,
            },
        });

        if (!comment_like) {
            res.status(404);
            return res.send({
                message: `Comment with id ${req.params.comment_id} has no likes from this user!`,
            });
        }

        res.status(200).json({ message: `Comment Like deleted successfully!` });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
