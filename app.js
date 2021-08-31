const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const { graphqlHTTP } = require('express-graphql');
const graphqSchema = require('./graphQl/schema');
const graphqResolvers = require('./graphQl/resolvers');
const auth = require('./middlware/auth');
const fileHelper = require('./util/file');

const app = express();
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'images')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
})
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        cb(null, false);
    }
};
const upload = multer({ storage: storage, fileFilter: fileFilter })
// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(upload.single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'OPTIONS, GET, POST, PUT, PATCH, DELETE'
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(auth);

app.put('/postimage', (req, res, next) => {
    if (!req.isAuth) {
        const error = new Error('Not Authuticated');
        error.code = 401;
        throw error;
    }
    if (!req.file) {
        return res.status(200).json({ message: 'no file providded!.' });
    }
    if (req.body.oldPath) {
        fileHelper.deleteFile(req.body.oldPath);
    }
    //console.log('req.file.path',req.file.path)
    return res.status(201).json({ message: 'file stored', filePath: req.file.filename });
});

app.use('/graphql', graphqlHTTP({
    schema: graphqSchema,
    rootValue: graphqResolvers,
    graphiql: true,
    // customFormatErrorFn(err) {
    //     if (!err.originalError) {
    //         return err;
    //     }
    //     const data = err.originalError.data;
    //     const message = err.message || "an error occurred";
    //     const code = err.originalError.code || 500;
    //     return { message: message, status: code, data: data };
    // }
}));
app.use((error, req, res, next) => {
    console.log(error);
    const status = req.statusCode || 500;
    const message = error.message;
    const data = error.data
    res.status(status).json({ message: message, data: data });
});
mongoose.connect('mongodb://localhost/messages', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(result => {

        app.listen(8080);

    }).catch(err => {
        console.log(err);
    });