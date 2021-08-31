const { validationResult } = require('express-validator');

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.signUp = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('validation failed entered data is incorrect.');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }

    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;

    bcrypt.hash(password, 12)
        .then(hashpassword => {

            const user = new User({
                email: email,
                password: hashpassword,
                name: name
            });
            return user.save();
        })
        .then(result => {
            res.status(201).json({
                message: 'user created',
                userId: result._id
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loudeduser;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {

        const error = new Error('validation failed entered data is incorrect.');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }

    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                const error = new Error(' a user with that email not found.');
                error.statusCode = 401;
                throw error;
            }
            loudeduser = user;
            return bcrypt.compare(password, user.password)

        }).then(doMatch => {
            if (!doMatch) {
                const error = new Error('wrong password.');
                error.statusCode = 401;
                throw error
            }
            const token = jwt.sign({
                email: loudeduser.email,
                name: loudeduser.name,
                userId: loudeduser._id.toString(),
            }, "somsupersecretkey",
                {
                    expiresIn: '1h'
                });
                res.status(200).json({token:token,userId:loudeduser._id.toString()});
        })

        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
};