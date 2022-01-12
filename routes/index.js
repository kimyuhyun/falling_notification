const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const fs = require('fs');
const db = require('../db');
const utils = require('../Utils');
const moment = require('moment');


async function setLog(req, res, next) {
    const ip = req.sessionID;
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

    //현재 접속자 파일 생성
    var memo = new Date().getTime() + "|S|" + req.baseUrl + req.path;
    fs.writeFile('./liveuser/'+ip, memo, function(err) {
        console.log(memo);
    });
    //
    next();
}

router.get('/', function(req, res, next) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let sql = `SELECT visit FROM ANALYZER_tbl ORDER BY idx DESC LIMIT 0, 10`;
    db.query(sql, function(err, rows, fields) {
        if (!err) {
            console.log(rows);
        }
    });

    res.render('index', {
        title: 'Falling notification api',
        session: `${ip}`,
        mode: process.env.NODE_ENV,
    });
});

var functionArr = [];
var txt = '';
var len = 0;

router.get('/mf', async function(req, res, next) {
    var arr = [
        ['주택담보대출', '중도금', '전세대출', '신용대출', '보증금담보대출', '기타담보대출', '예금담보대출', '기타대출'],
        ['만기일시', '원금균등', '원리금균등', '', '', '', '',''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],

    ];
/*
*   배열의 가로 세로를 동일 하게 마춰줘야한다!
*/
    functionArr = [];

    await print_all_case(arr, 0, '');

    const set = new Set(functionArr);
    const uniqueArr = [...set];

    for (val of uniqueArr) {
        if (val.indexOf('undefined') == -1) {
            if (val.substring(0,1) != '_') {
                txt += `function _${val}(rate, income, amount0, amount1, amount2, month0, month1, month2) {<br>console.log(arguments.callee.name);<Br>}<Br>`;
            }
        }
    }

    res.send(txt);
});



async function print_all_case(arr, idx, val) {
    len = arr.length;

    if (idx == len) {
        functionArr.push(val);
        return;
    }

    for (var i = 0; i < len; i++) {
        var cur = arr[idx][i];
        var val_new = val;
        if (idx != 0) {
            if (cur != '') {
                val_new += '_';
            }
        }
        val_new += cur;

        if (idx != 0 && i == len) {
            console.log(len);
            return;
        }


        await print_all_case(arr, eval(idx+1), val_new);
    }
}


module.exports = router;
