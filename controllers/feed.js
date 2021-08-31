const { validationResult } = require('express-validator');
const Post = require('../models/post');
const User = require('../models/User');
const io = require('../socket');

const fileHelper = require('../util/file');
exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;
    Post.find().countDocuments().then(count => {
        totalItems = count;
        return Post.find().populate('creator').sort({createdAt:-1}).skip((currentPage - 1) * perPage).limit(perPage);
    }).then(posts => {
        res.status(200).json({ message: 'posts featched successfully', posts: posts, totalItems: totalItems });
    }).catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);

    });

};


exports.createPost = (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('validation failed entered data is incorrect.');
        error.statusCode = 422;
        throw error;
    }
    if (!req.file) {
        const error = new Error('no image provided.');
        error.statusCode = 422;
        throw error;
    }
    const title = req.body.title;
    const content = req.body.content;
    const imageUrl = req.file.filename;
    //console.log(req.file.filename)
    //create post in the database
    let creator;
    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId
    });
    post.save().then(result => {
        return User.findById(req.userId);

    }).then(user => {
        creator = user;
        user.posts.push(post);
        return user.save();

    })
        .then(result => {
            io.getIO().emit('posts', { action: 'create', post: {...post._doc,creator:{_id:req.userId,name: creator.name}} })
            res.status(201).json({
                post: post,
                creator: { _id: creator._id, name: creator.name }
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
};

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId).then(post => {
        if (!post) {
            const error = new Error('could not find post.');
            error.statusCode = 404;
            throw error;
        }
        //console.log(post.imageUrl);
        res.status(200).json({ message: 'post featched', post: post });
    }).catch(err => {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    })
};

exports.updatePost = (req, res, next) => {
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    //console.log(imageUrl)
let post;
    if (req.file) {
        imageUrl = req.file.filename;
    }
    //console.log(imageUrl)
    if (!imageUrl) {
        const error = new Error('no file picked');
        error.statusCode = 422;
        throw error;
    }
    Post.findById(postId).populate('creator').then(post => {

        if (!post) {
            const error = new Error('could not find post.');
            error.statusCode = 404;
            throw error;
        }
        post=post;
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('Not Authorized.');
            error.statusCode = 403;
            throw error;
        }
        if (imageUrl != post.imageUrl) {
            fileHelper.deleteFile('images/' + post.imageUrl);

        }
        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        return post.save();
    })
        .then(result => {
            io.getIO().emit('posts', { action: 'create', post: post })

            res.status(200).json({ message: 'post updated', post: result });

        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
};

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId).then(post => {
        if (!post) {
            const error = new Error('could not find post.');
            error.statusCode = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId) {
            const error = new Error('Not Authorized.');
            error.statusCode = 403;
            throw error;
        }
        fileHelper.deleteFile('images/' + post.imageUrl);
        return Post.findByIdAndRemove(postId);
    }).then(result => {
        return User.findById(req.userId);
    })
        .then(user => {
            user.posts.pull(postId);
            return user.save();
        })
        .then(result => {
            console.log('post deleted');
            res.status(200).json({ message: 'post deleted' });

        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
};