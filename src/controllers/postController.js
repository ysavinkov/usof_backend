import { User } from "../models/user.entity.js";
import { Post } from "../models/post.entity.js";
import { Category } from "../models/category.entity.js";
import { PostCategory } from "../models/post_category.entity.js";
import { PostLike } from "../models/like.entity.js";
import { Comment } from "../models/comment.entity.js";

export const get_posts = async (req, res) => {
    let { page = 1, limit = 5, sortBy = "rating", sortOrder = "DESC" } = req.body;
    if (sortBy != "rating" && sortBy != "createdAt") {
        return res.status(400).send({ message: "Wrong sorting column!" });
    }
    if (sortOrder != "DESC" && sortOrder != "ASC") {
        return res.status(400).send({ message: "Wrong sorting order!" });
    }
    try {
        const posts = await Post.findAll({
            limit: limit,
            offset: (page - 1) * limit,
            order: [[sortBy, sortOrder]],
        });
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const get_post = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.post_id);
        if (!post) {
            res.status(404);
            return res.send({ message: `Post with id ${req.params.post_id} not found!` });
        }
        res.status(200).json(post);
    } catch (err) {
        console.log(err);
    }
};

export const get_comments = async (req, res) => {
    try {
        const comments = await Comment.findAll({
            where: {
                post_id: req.params.post_id,
            },
        });
        if (comments.length == 0) {
            res.status(404);
            return res.send({
                message: `Comments for post with id ${req.params.post_id} not found!`,
            });
        }
        res.status(200).json(comments);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const post_comments = async (req, res) => {
    if (!req.body.content) {
        return res.status(400).send("Content is required!");
    }
    try {
        await Comment.create({
            author_id: req.user.user_id,
            post_id: req.params.post_id,
            content: req.body.content,
        });
        res.status(200).json({ message: "Comment created successfully!" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const get_categories = async (req, res) => {
    try {
        const post_categories = await PostCategory.findAll({
            where: {
                postId: req.params.post_id,
            },
        });
        if (post_categories.length == 0) {
            res.status(404);
            return res.send({
                message: `Categories for post with id ${req.params.post_id} not found!`,
            });
        }
        const categoryIds = post_categories.map((postCategory) => postCategory.categoryId);

        const categories = await Category.findAll({
            where: {
                category_id: categoryIds,
            },
        });

        res.status(200).json(categories);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const get_likes = async (req, res) => {
    try {
        const post_likes = await PostLike.findAll({
            where: {
                post_id: req.params.post_id,
            },
        });
        if (post_likes.length == 0) {
            res.status(404);
            return res.send({
                message: `Likes for post with id ${req.params.post_id} not found!`,
            });
        }

        res.status(200).json(post_likes);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const post_post = async (req, res) => {
    try {
        if (!(req.body.title && req.body.content && req.body.categories)) {
            return res.status(400).send("All input is required");
        }

        const categories = await Category.findAll({
            where: {
                title: req.body.categories,
            },
        });

        if (categories.length !== req.body.categories.length) {
            return res.status(400).send({ message: "Invalid set of categories!" });
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
        res.status(500).send({ message: error.message });
    }
};

export const post_like = async (req, res) => {
    if (!req.body.type) {
        return res.status(400).send("Like type is required!");
    }
    try {
        const post = await Post.findByPk(req.params.post_id);

        if (!post) {
            res.status(404);
            return res.send({ message: `Post with id ${req.params.post_id} not found!` });
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
        res.status(500).send({ message: error.message });
    }
};

export const patch_post = async (req, res) => {
    try {
        if (!(req.body.title && req.body.content && req.body.categories)) {
            return res.status(400).send("All input is required");
        }

        const checkAuthor = await Post.findByPk(req.params.post_id);

        if (checkAuthor.author_id != req.user.user_id) {
            return res.status(403).send({ message: "Access denied!" });
        }

        const categories = await Category.findAll({
            where: {
                title: req.body.categories,
            },
        });

        if (categories.length !== req.body.categories.length) {
            return res.status(400).send({ message: "Invalid set of categories!" });
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
            res.status(404);
            return res.send({ message: `Post with id ${req.params.post_id} not found!` });
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
        res.status(500).send({ message: error.message });
    }
};

export const delete_post = async (req, res) => {
    try {
        const checkAuthor = await Post.findByPk(req.params.post_id);

        if (checkAuthor.author_id != req.user.user_id) {
            return res.status(403).send({ message: "Access denied!" });
        }

        const post = await Post.destroy({ where: { post_id: req.params.post_id } });
        if (!post) {
            res.status(404);
            return res.send({ message: `Post with id ${req.params.post_id} not found!` });
        }

        return res.status(200).send({ message: `Post with id ${req.params.post_id} was deleted!` });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

export const delete_like = async (req, res) => {
    try {
        const post = await Post.findByPk(req.params.post_id);

        if (!post) {
            res.status(404);
            return res.send({ message: `Post with id ${req.params.post_id} not found!` });
        }

        const post_like = await PostLike.destroy({
            where: {
                author_id: req.user.user_id,
                post_id: req.params.post_id,
            },
        });

        if (!post_like) {
            res.status(404);
            return res.send({
                message: `Post with id ${req.params.post_id} has no likes from this user!`,
            });
        }

        res.status(200).json({ message: `Post Like deleted successfully!` });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
