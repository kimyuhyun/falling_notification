const express = require('express');
const router = express.Router();
const fs = require('fs')
const multer = require('multer');
const uniqid = require('uniqid');
const sharp = require('sharp');
const cors = require('cors');
const axios = require('axios');

require('dotenv').config();

var upload = multer({
    storage: multer.diskStorage({
        destination: function(req, file, cb) {
            var date = new Date();
            var month = eval(date.getMonth() + 1);
            if (eval(date.getMonth() + 1) < 10) {
                month = "0" + eval(date.getMonth() + 1);
            }
            var dir = 'data/' + date.getFullYear() + "" + month;
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir);
            }
            cb(null, dir);
        },
        filename: function(req, file, cb) {
            var tmp = file.originalname.split('.');
            var mimeType = tmp[tmp.length - 1];
            if ('php|phtm|htm|cgi|pl|exe|jsp|asp|inc'.includes(mimeType)) {
                cb(null, file.originalname + 'x');
                return;
            }

            if ('pdf|ppt|pptx|xls|xlsx|doc|docx|hwp|zip|txt'.includes(mimeType)) {
                cb(null, file.originalname);
            } else {
                cb(null, uniqid(file.filename) + '.' + mimeType);
            }
        }
    })
});

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', {
        title: 'Image server',
    });
});

router.get('/file_upload', function(req, res, next) {
    console.log(process.env.HOST_NAME);
    var html = `
        <div>`+process.env.HOST_NAME+`</div>
        <form method='post' action='./file_upload' enctype='multipart/form-data'>
            <input type='file' name='upload_file' />
            <input type='submit'>
        </form>
    `;
    res.send(html);
});

router.post('/file_upload', cors(), upload.single('upload_file'), async function(req, res, next) {
    const file = req.file;
    var result = '';
    var type = '';

    await new Promise(function(resolve, reject) {
        var destWidth = parseInt(process.env.IMAGE_WIDTH);
        var tmp = file.originalname.split('.');
        var mimeType = tmp[tmp.length - 1];
        tmp = file.filename.split('.');
        var filename = tmp[0];
        var resizeFile = file.destination + '/' + filename + '.' + mimeType;


        if ('jpg|jpeg|png|gif'.includes(mimeType)) {
            var img = new sharp(file.path);
            img.metadata().then(function(meta) {
                if (meta.width <= destWidth) {
                    resolve({
                        path: file.path,
                        type: mimeType,
                    });
                } else {
                    //리사이즈
                    try {
                        sharp(file.path).resize({ width: destWidth })
                            .withMetadata()
                            .toFile(resizeFile, function(err, info) {
                                if (!err) {
                                    // console.log('info', info);
                                    //원본파일 삭제!!
                                    fs.unlink(file.path, function(err) {
                                        if (err) {
                                            throw err
                                        }
                                    });
                                    //
                                } else {
                                    throw err
                                }
                            });
                    } catch (e) {
                        console.log('ImageResize Error', e);
                    } finally {
                        resolve({
                            path: resizeFile,
                            type: mimeType,
                        });
                    }
                }
            });
        } else {
            resolve({
                path: file.path,
                type: mimeType,
            });
        }
    }).then(function(data) {
        result = data.path;
        type = data.type;
    });


    var interval = setInterval(function() {
        console.log(isFileUploaded(result));
        if (isFileUploaded(result)) {
            clearInterval(interval);
            var path = process.env.HOST_NAME + '/' + result;
            // res.send("<img src='" + path + "'/>");

            res.send({
                url: path,
                type: type,
            });
        }
    }, 500);
});


async function isFileUploaded(path) {
    await new Promise(function(resolve, reject) {
        fs.exists(path, function(exists) {
            resolve(exists);
        });
    }).then(function(data) {
        console.log(data);
        return data;
    });
}



module.exports = router;
