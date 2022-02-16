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

    var sql = `SELECT visit FROM ANALYZER_tbl WHERE ip = ? ORDER BY idx DESC LIMIT 0, 1`;
    var params = [ip];
    var rows = await utils.queryResult(sql, params);

    var cnt = 1;
    if (rows[0]) {
        var cnt = rows[0].visit + 1;
    }

    sql = `INSERT INTO ANALYZER_tbl SET ip = ?, agent = ?, visit = ?, created = NOW()`;
    params = [ip, req.headers['user-agent'], cnt];
    var result = await utils.queryResult(sql, params);

    //4분이상 것들 삭제!!
    fs.readdir('./liveuser', async function(err, filelist) {
        for (file of filelist) {
            await fs.readFile('./liveuser/' + file, 'utf8', function(err, data) {
                if (!err) {
                    try {
                        var tmp = data.split('|S|');
                        moment.tz.setDefault("Asia/Seoul");
                        var connTime = moment.unix(tmp[0] / 1000).format('YYYY-MM-DD HH:mm');
                        var minDiff = moment.duration(moment(new Date()).diff(moment(connTime))).asMinutes();
                        if (minDiff > 4) {
                            fs.unlink('./liveuser/' + file, function(err) {
                                if (err) {
                                    console.log(err);
                                }
                            });
                        }
                    } catch (e) {
                        console.log(e);
                    }
                } else {
                    console.log(err);
                }
            });
        }
    });

    //현재 접속자 파일 생성
    var memo = new Date().getTime() + "|S|" + req.baseUrl + req.path;
    fs.writeFile('./liveuser/' + ip, memo, function(err) {
        if (err) {
            console.log(err);
        }
    });
    //
    next();
}

router.get('/get_user_info/:id', setLog, async function(req, res, next) {
    const id = req.params.id;

    var arr = [];
    await new Promise(function(resolve, reject) {
        const sql = `SELECT * FROM MEMB_tbl WHERE id = ?`;
        db.query(sql, id, function(err, rows, fields) {
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


router.post('/set_step_count', setLog, async function(req, res, next) {
    const { id, date1, steps } = req.body;

    await new Promise(function(resolve, reject) {
        const sql = `
            INSERT INTO STEPS_tbl SET
            id = ?,
            date1 = ?,
            steps = ?
        `;
        db.query(sql, [id, date1, steps], function(err, rows, fields) {
            if (!err) {
                resolve(rows);
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });
    }).then();

    //다음날을 리턴해준다!!
    var next_date = moment().add(1, 'days').format('YYYY-MM-DD');
    res.send({
        next_date: next_date
    });

    //
});


router.get('/get_steps_list/:id', setLog, async function(req, res, next) {
    const id = req.params.id;

    var arr = [];
    await new Promise(function(resolve, reject) {
        const sql = `SELECT * FROM STEPS_tbl WHERE id = ? ORDER BY idx DESC`;
        db.query(sql, id, function(err, rows, fields) {
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

router.get('/get_my_workout_list/:id', setLog, async function(req, res, next) {
    const id = req.params.id;

    var arr = [];
    await new Promise(function(resolve, reject) {
        const sql = `SELECT idx, title, url, filename0 FROM BOARD_tbl WHERE board_id = 'workout' ORDER BY idx DESC`;
        db.query(sql, function(err, rows, fields) {
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

router.get('/get_my_supplements_list/:id', setLog, async function(req, res, next) {
    const id = req.params.id;

    var arr = [];
    await new Promise(function(resolve, reject) {
        const sql = `SELECT idx, title, url, filename0 FROM BOARD_tbl WHERE board_id = 'supplements' ORDER BY idx DESC`;
        db.query(sql, function(err, rows, fields) {
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



module.exports = router;
