const fs = require('fs');

const deleteFile = (filePath) => {
    fs.unlink('images/' +filePath, (err) => {
        if (err) {
            throw (err);
        }
    });
}

exports.deleteFile = deleteFile;