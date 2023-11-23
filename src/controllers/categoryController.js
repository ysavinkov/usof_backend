import { Category } from "../models/category.entity.js";
import { Post } from "../models/post.entity.js";
import { PostCategory } from "../models/post_category.entity.js";

export const get_categories = async (req, res) => {
    try {
        const categories = await Category.findAll();
        return res.status(200).json(categories);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const get_category = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.category_id);
        if (!category) {
            res.status(404);
            return res.send({ message: `Category with id ${req.params.category_id} not found!` });
        }
        return res.status(200).json(category);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const get_posts_with_category = async (req, res) => {
    try {
        const post_categories = await PostCategory.findAll({
            where: {
                categoryId: req.params.category_id,
            },
        });
        if (post_categories.length == 0) {
            res.status(404);
            return res.send({
                message: `Posts associated with category with id ${req.params.category_id} not found!`,
            });
        }
        const postIds = post_categories.map((postCategory) => postCategory.postId);

        const posts = await Post.findAll({
            where: {
                post_id: postIds,
            },
        });

        res.status(200).json(posts);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const post_category = async (req, res) => {
    if (!req.body.title) {
        return res.status(400).send({ message: "Title is required!" });
    }
    try {
        await Category.create({
            title: req.body.title,
            description: req.body.description,
        });

        return res.status(200).send({ message: "Category was created!" });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const patch_category = async (req, res) => {
    try {
        const category = await Category.findByPk(req.params.category_id);

        if (!category) {
            res.status(404);
            return res.send({ message: `Category with id ${req.params.category_id} not found!` });
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
            .send({ message: `Category with id ${req.params.category_id} was updated!` });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

export const delete_category = async (req, res) => {
    try {
        const category = await Category.destroy({ where: { category_id: req.params.category_id } });
        if (!category) {
            res.status(404);
            return res.send({ message: `Category with id ${req.params.category_id} not found!` });
        }

        return res
            .status(200)
            .send({ message: `Category with id ${req.params.category_id} was deleted!` });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};
