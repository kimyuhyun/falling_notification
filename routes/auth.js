const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const fs = require('fs');
const db = require('../db');
const utils = require('../Utils');
const moment = require('moment');
const requestIp = require('request-ip');
const commaNumber = require('comma-number');
const axios = require('axios');


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



router.get('/is_memb/:id', setLog, async function(req, res, next) {
    const id = req.params.id;

    //이미 회원인지 체크
    await new Promise(function(resolve, reject) {
        const sql = `SELECT *, count(*) as cnt FROM MEMB_tbl WHERE id = ?`;
        db.query(sql, id, function(err, rows, fields) {
            console.log(rows);
            if (!err) {
                resolve(rows[0]);
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });
    }).then(async function(data) {
        res.send(data);
    });

});



//푸시 테스트!
// http://localhost:3001/auth/ptest
router.get('/ptest', setLog, async function(req, res, next) {
    var fcmArr = ['enNDpMjgTGWApEm-3qG3d1:APA91bHQc5kwjyaIvvQqxkCRcqsGBcRXUr_jbxxrntTqjAUrcs2GTfZyh3hmhko_oEBcTqMW5Ft_bJgXwTm04eDayGGJsAjoEydKMgXtaSGRr9mFYHE-xBKRhyiuoDQNH7H5pf0r73wW'];
    utils.sendPush(fcmArr, 'ptest','ptest입니다!');
});


module.exports = router;
