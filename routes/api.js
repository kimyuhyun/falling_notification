const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const fs = require('fs');
const db = require('../db');
const utils = require('../Utils');
const moment = require('moment');
const axios = require('axios');
const qs = require('qs');

async function setLog(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    var rows;
    await new Promise(function(resolve, reject) {
        var sql = `SELECT visit FROM ANALYZER_tbl WHERE ip = ? ORDER BY idx DESC LIMIT 0, 1`;
        db.query(sql, ip, function(err, rows, fields) {
            if (!err) {
                resolve(rows);
            }
        });
    }).then(function(data){
        rows = data;
    });

    await new Promise(function(resolve, reject) {
        var sql = `INSERT INTO ANALYZER_tbl SET ip = ?, agent = ?, visit = ?, created = NOW()`;
        if (rows.length > 0) {
            var cnt = rows[0].visit + 1;
            db.query(sql, [ip, req.headers['user-agent'], cnt], function(err, rows, fields) {
                resolve(cnt);
            });
        } else {
            db.query(sql, [ip, req.headers['user-agent'], 1], function(err, rows, fields) {
                resolve(1);
            });
        }
    }).then(function(data) {
        console.log(data);
    });

    //4분이상 것들 삭제!!
    fs.readdir('./liveuser', async function(err, filelist) {
        for (file of filelist) {
            await new Promise(function(resolve, reject) {
                fs.readFile('./liveuser/' + file, 'utf8', function(err, data) {
                    resolve(data);
                });
            }).then(function(data) {
                try {
                    if (file != 'dummy') {
                        var tmp = data.split('|S|');
                        console.log(data);
                        moment.tz.setDefault("Asia/Seoul");
                        var connTime = moment.unix(tmp[0] / 1000).format('YYYY-MM-DD HH:mm');
                        var minDiff = moment.duration(moment(new Date()).diff(moment(connTime))).asMinutes();
                        if (minDiff > 4) {
                            console.log(minDiff);
                            fs.unlink('./liveuser/' + file, function(err) {
                                console.log(err);
                            });
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            });
        }
    });

    //현재 접속자 파일 생성
    var memo = new Date().getTime() + "|S|" + req.baseUrl + req.path;
    fs.writeFile('./liveuser/'+ip, memo, function(err) {
        console.log(memo);
    });
    //
    next();
}

router.get('/get_episode/:code1', setLog, async function(req, res, next) {
    let code1 = req.params.code1;

    var arr = [];
    await new Promise(function(resolve, reject) {
        const sql = `SELECT code1, name1 FROM CODES_tbl WHERE LEFT(code1,4) = ? AND LENGTH(code1) = 6 ORDER BY sort1 DESC`;
        db.query(sql, code1, function(err, rows, fields) {
            console.log(rows);
            if (!err) {
                resolve(rows);
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });
    }).then(async function(data) {
        arr = await utils.nvl(data);
    });

    res.send(arr);
});

router.get('/get_quiz/:code1', setLog, async function(req, res, next) {
    let code1 = req.params.code1;

    var arr = [];
    await new Promise(function(resolve, reject) {
        const sql = `SELECT * FROM QUIZ_tbl WHERE code1 = ? ORDER BY seq ASC`;
        db.query(sql, code1, function(err, rows, fields) {
            console.log(rows);
            if (!err) {
                resolve(rows);
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });
    }).then(async function(data) {
        arr = await utils.nvl(data);
    });

    res.send(arr);
});

router.get('/get_rand_quiz/:code1', setLog, async function(req, res, next) {
    let code1 = req.params.code1;
    var subjectArr = [];
    var arr = [];
    var i = 0;

    //과목갯수 구하기!!
    await new Promise(function(resolve, reject) {
        const sql = `SELECT subject FROM QUIZ_tbl WHERE LEFT(code1, 4) = ? GROUP BY subject`;
        db.query(sql, code1, function(err, rows, fields) {
            // console.log(rows);
            if (!err) {
                resolve(rows);
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });
    }).then(async function(data) {
        for (obj of await utils.nvl(data)) {
            subjectArr.push(obj.subject);
        }
    });


    //과목별 랜덤 20개 씩가져온다!
    for (subject of subjectArr) {
        await new Promise(function(resolve, reject) {
            const sql = `SELECT * FROM QUIZ_tbl WHERE LEFT(code1, 4) = ? AND subject = ? ORDER BY RAND() LIMIT 0, 20`;
            db.query(sql, [code1,subject], function(err, rows, fields) {
                if (!err) {
                    resolve(rows);
                } else {
                    console.log(err);
                    res.send(err);
                    return;
                }
            });
        }).then(async function(data) {
            for (obj of await utils.nvl(data)) {
                i++;
                obj.rand_seq = i;
                arr.push(obj);
            }
        });
    }
    res.send(arr);
});

module.exports = router;
