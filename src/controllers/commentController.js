import { Comment } from "../models/comment.entity.js";
import { CommentLike } from "../models/like.entity.js";

import ApiError from "../error/ApiError.js";

export const get_comment = async (req, res, next) => {
    try {
        const comment = await Comment.findByPk(req.params.comment_id);
        if (!comment) {
            return next(ApiError.badRequest(`Comment with id ${req.params.comment_id} not found!`));
        }
        return res.status(200).json(comment);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const get_comment_likes = async (req, res, next) => {
    try {
        const comment_likes = await CommentLike.findAll({
            where: {
                comment_id: req.params.comment_id,
            },
        });

        res.status(200).json(comment_likes);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const post_comment_like = async (req, res, next) => {
    if (!req.body.type) {
        return next(ApiError.badRequest("Like type is required"));
    }
    try {
        const comment = await Comment.findByPk(req.params.comment_id);

        if (!comment) {
            return next(ApiError.badRequest(`Comment with id ${req.params.comment_id} not found!`));
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
        return next(ApiError.internal(error.message));
    }
};

export const patch_comment = async (req, res, next) => {
    if (!req.body.content) {
        return next(ApiError.badRequest("Content is required"));
    }
    try {
        const checkAuthor = await Comment.findByPk(req.params.comment_id);

        if (checkAuthor.author_id != req.user.user_id) {
            return next(ApiError.forbidden("Access denied"));
        }

        const comment = await Comment.update(
            {
                content: req.body.content,
            },
            { where: { comment_id: req.params.comment_id } }
        );

        if (!comment) {
            return next(ApiError.badRequest(`Comment with id ${req.params.comment_id} not found!`));
        }

        return res
            .status(200)
            .json({ message: `Comment with id ${req.params.comment_id} was updated!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const delete_comment = async (req, res, next) => {
    try {
        const checkAuthor = await Comment.findByPk(req.params.comment_id);

        if (checkAuthor.author_id != req.user.user_id) {
            return next(ApiError.forbidden("Access denied"));
        }

        const comment = await Comment.destroy({ where: { comment_id: req.params.comment_id } });
        if (!comment) {
            return next(ApiError.badRequest(`Comment with id ${req.params.comment_id} not found!`));
        }

        return res
            .status(200)
            .json({ message: `Comment with id ${req.params.comment_id} was deleted!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const delete_comment_like = async (req, res, next) => {
    try {
        const comment = await Comment.findByPk(req.params.comment_id);

        if (!comment) {
            return next(ApiError.badRequest(`Comment with id ${req.params.comment_id} not found!`));
        }

        const comment_like = await CommentLike.destroy({
            where: {
                author_id: req.user.user_id,
                comment_id: req.params.comment_id,
            },
        });

        if (!comment_like) {
            return next(
                ApiError.badRequest(
                    `Comment with id ${req.params.comment_id} has no likes from this user!`
                )
            );
        }

        res.status(200).json({ message: `Comment Like deleted successfully!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};
