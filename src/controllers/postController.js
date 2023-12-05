import { User } from "../models/user.entity.js";
import { Post } from "../models/post.entity.js";
import { Category } from "../models/category.entity.js";
import { PostCategory } from "../models/post_category.entity.js";
import { PostLike } from "../models/like.entity.js";
import { Comment } from "../models/comment.entity.js";

import ApiError from "../error/ApiError.js";

export const get_posts = async (req, res, next) => {
    let { page, limit, sortBy, sortOrder } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 5;
    sortBy = sortBy === "rating" || sortBy === "createdAt" ? sortBy : "rating";
    sortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

    try {
        const posts = await Post.findAndCountAll({
            limit: limit,
            offset: (page - 1) * limit,
            order: [[sortBy, sortOrder]],
        });

        res.status(200).json(posts);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const get_post = async (req, res, next) => {
    try {
        const post = await Post.findByPk(req.params.post_id);
        if (!post) {
            return next(ApiError.badRequest(`Post with id ${req.params.post_id} not found!`));
        }
        res.status(200).json(post);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const get_comments = async (req, res, next) => {
    try {
        const sortBy = "rating";
        const sortOrder = "DESC";

        const comments = await Comment.findAll({
            where: {
                post_id: req.params.post_id,
            },
            order: [[sortBy, sortOrder]],
        });
        if (comments.length == 0) {
            return next(
                ApiError.badRequest(`Comments for post with id ${req.params.post_id} not found!`)
            );
        }
        res.status(200).json(comments);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const post_comments = async (req, res, next) => {
    if (!req.body.content) {
        return next(ApiError.badRequest("Content is required!"));
    }
    try {
        await Comment.create({
            author_id: req.user.user_id,
            post_id: req.params.post_id,
            content: req.body.content,
        });
        res.status(200).json({ message: "Comment created successfully!" });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const get_categories = async (req, res, next) => {
    try {
        const post_categories = await PostCategory.findAll({
            where: {
                postId: req.params.post_id,
            },
        });
        if (post_categories.length == 0) {
            return res.status(200).json([]);
        }
        const categoryIds = post_categories.map((postCategory) => postCategory.categoryId);

        const categories = await Category.findAll({
            where: {
                category_id: categoryIds,
            },
        });

        res.status(200).json(categories);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const get_likes = async (req, res, next) => {
    try {
        const post_likes = await PostLike.findAll({
            where: {
                post_id: req.params.post_id,
            },
        });

        res.status(200).json(post_likes);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const post_post = async (req, res, next) => {
    try {
        if (!(req.body.title && req.body.content && req.body.categories)) {
            return next(ApiError.badRequest("All input is required"));
        }

        const categories = await Category.findAll({
            where: {
                title: req.body.categories,
            },
        });

        if (categories.length !== req.body.categories.length) {
            return next(ApiError.badRequest("Invalid set of categories"));
        }

        const post = await Post.create({
            title: req.body.title,
            author_id: req.user.user_id,
            content: req.body.content,
        });

        for (let i = 0; i < categories.length; i++) {
            await PostCategory.create({
                postId: post.post_id,
                categoryId: categories[i].category_id,
            });
        }

        res.status(200).json({ message: "Post created successfully!" });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const post_like = async (req, res, next) => {
    if (!req.body.type) {
        return next(ApiError.badRequest("Like type is required!"));
    }
    try {
        const post = await Post.findByPk(req.params.post_id);

        if (!post) {
            return next(ApiError.badRequest(`Post with id ${req.params.post_id} not found!`));
        }

        await PostLike.destroy({
            where: {
                author_id: req.user.user_id,
                post_id: req.params.post_id,
            },
        });

        await PostLike.create({
            author_id: req.user.user_id,
            post_id: req.params.post_id,
            type: req.body.type,
        });

        res.status(200).json({ message: `${req.body.type} created successfully!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const patch_post = async (req, res, next) => {
    try {
        if (!(req.body.title && req.body.content && req.body.categories)) {
            return next(ApiError.badRequest("All input is required"));
        }

        const checkAuthor = await Post.findByPk(req.params.post_id);

        if (checkAuthor.author_id != req.user.user_id) {
            return next(ApiError.forbidden("Access denied"));
        }

        const categories = await Category.findAll({
            where: {
                title: req.body.categories,
            },
        });

        if (categories.length !== req.body.categories.length) {
            return next(ApiError.badRequest("Invalid set of categories"));
        }

        const post = await Post.update(
            {
                title: req.body.title,
                author_id: req.user.user_id,
                content: req.body.content,
                status: req.body.status,
            },
            { where: { post_id: req.params.post_id } }
        );
        if (!post) {
            return next(ApiError.badRequest(`Post with id ${req.params.post_id} not found!`));
        }

        await PostCategory.destroy({
            where: {
                postId: req.params.post_id,
            },
        });

        for (let i = 0; i < categories.length; i++) {
            await PostCategory.create({
                postId: req.params.post_id,
                categoryId: categories[i].category_id,
            });
        }

        res.status(200).json({ message: `Post with id ${req.params.post_id} was updated!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const delete_post = async (req, res, next) => {
    try {
        const checkAuthor = await Post.findByPk(req.params.post_id);

        if (checkAuthor.author_id != req.user.user_id) {
            return next(ApiError.forbidden("Access denied"));
        }

        const post = await Post.destroy({ where: { post_id: req.params.post_id } });
        if (!post) {
            return next(ApiError.badRequest(`Post with id ${req.params.post_id} not found!`));
        }

        return res.status(200).json({ message: `Post with id ${req.params.post_id} was deleted!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const delete_like = async (req, res, next) => {
    try {
        const post = await Post.findByPk(req.params.post_id);

        if (!post) {
            return next(ApiError.badRequest(`Post with id ${req.params.post_id} not found!`));
        }

        const post_like = await PostLike.destroy({
            where: {
                author_id: req.user.user_id,
                post_id: req.params.post_id,
            },
        });

        if (!post_like) {
            return next(
                ApiError.badRequest(
                    `Post with id ${req.params.post_id} has no likes from this user!`
                )
            );
        }

        res.status(200).json({ message: `Post Like deleted successfully!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};
