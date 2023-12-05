import { Category } from "../models/category.entity.js";
import { Post } from "../models/post.entity.js";
import { PostCategory } from "../models/post_category.entity.js";

import ApiError from "../error/ApiError.js";

export const get_categories = async (req, res, next) => {
    try {
        const categories = await Category.findAll();
        return res.status(200).json(categories);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const get_category = async (req, res, next) => {
    try {
        const category = await Category.findByPk(req.params.category_id);
        if (!category) {
            return next(
                ApiError.badRequest(`Category with id ${req.params.category_id} not found!`)
            );
        }
        return res.status(200).json(category);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const get_posts_with_category = async (req, res, next) => {
    let { page, limit, sortBy, sortOrder } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 5;
    sortBy = sortBy === "rating" || sortBy === "createdAt" ? sortBy : "rating";
    sortOrder = sortOrder === "ASC" || sortOrder === "DESC" ? sortOrder : "DESC";

    try {
        const post_categories = await PostCategory.findAll({
            where: {
                categoryId: req.params.category_id,
            },
        });
        if (post_categories.length == 0) {
            return next(
                ApiError.badRequest(
                    `Posts associated with category with id ${req.params.category_id} not found!`
                )
            );
        }
        const postIds = post_categories.map((postCategory) => postCategory.postId);

        const posts = await Post.findAndCountAll({
            where: {
                post_id: postIds,
            },
            limit: limit,
            offset: (page - 1) * limit,
            order: [[sortBy, sortOrder]],
        });

        res.status(200).json(posts);
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const post_category = async (req, res, next) => {
    if (!req.body.title) {
        return next(ApiError.badRequest("Title is required!"));
    }
    try {
        await Category.findOrCreate({
            title: req.body.title,
            description: req.body.description,
        });

        return res.status(200).json({ message: "Category was created!" });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const patch_category = async (req, res, next) => {
    try {
        const category = await Category.findByPk(req.params.category_id);

        if (!category) {
            return next(
                ApiError.badRequest(`Category with id ${req.params.category_id} not found!`)
            );
        }

        await Category.update(
            {
                title: req.body.title,
                description: req.body.description,
            },
            { where: { category_id: req.params.category_id } }
        );

        return res
            .status(200)
            .json({ message: `Category with id ${req.params.category_id} was updated!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};

export const delete_category = async (req, res, next) => {
    try {
        const category = await Category.destroy({ where: { category_id: req.params.category_id } });
        if (!category) {
            return next(
                ApiError.badRequest(`Category with id ${req.params.category_id} not found!`)
            );
        }

        return res
            .status(200)
            .json({ message: `Category with id ${req.params.category_id} was deleted!` });
    } catch (error) {
        return next(ApiError.internal(error.message));
    }
};
