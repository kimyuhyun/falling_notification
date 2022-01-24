const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const db = require('../db');
const menus = require('../menu');
const utils = require('../Utils');

//메뉴를 전역변수에 넣어준다!
global.MENUS = menus;
global.CURRENT_URL;
global.SHOW_MENU_LINK;
global.LEVEL1;
//

router.get('/test', async function(req, res, next) {
    res.render('./admin/test.html');
});

function userChecking(req, res, next) {
    if (req.session.mid == null) {
        res.redirect('/admin/login');
        return;
    }

    db.query("SELECT show_menu_link FROM GRADE_tbl WHERE level1 = '?'", req.session.level1, function(err, rows, fields) {
        if (!err) {
            var tmp = "";
            if (rows.length > 0) {
                tmp = rows[0].show_menu_link.substr(1, 9999).split(',');
            }
            CURRENT_URL = req.baseUrl + req.path;
            SHOW_MENU_LINK = tmp;
            LEVEL1 = req.session.level1;
            next();
        } else {
            res.send(err);
        }
    });
}

router.get('/', userChecking, function(req, res, next) {
    console.log(req.session);
    res.render('./admin/main', {
        myinfo: req.session,
    });
});

router.get('/login', function(req, res, next) {
    res.render('./admin/login', {
        year: new Date().getFullYear(),
        id: req.cookies['id'],
        pw: req.cookies['pw'],
    });
});

router.get('/logout', function(req, res, next) {
    // res.clearCookie('id', {
    //     path: '/'
    // });
    // res.clearCookie('name1', {
    //     path: '/'
    // });
    // res.clearCookie('level1', {
    //     path: '/'
    // });
    req.session.destroy(function(){
        res.clearCookie('sid');
        res.send('<script type="text/javascript">alert("로그아웃 되었습니다.");location.href="/admin/login"</script>');
    });
});



// POST 는 body 로 받는다!!!
router.post('/login', function(req, res, next) {
    db.query("SELECT idx, id, name1, level1, filename0 FROM MEMB_tbl WHERE id = ? AND pass1 = PASSWORD(?)", [req.body.id, req.body.pw], function(err, rows, fields) {
        if (!err) {
            if (rows[0] != null) {
                //레벨체크
                if (rows[0].level1 > 2) {
                    res.send('<script type="text/javascript">alert("접근권한이 없습니다.");history.back();</script>');
                    return;
                }
                //

                db.query("UPDATE MEMB_tbl SET modified = NOW() WHERE id = ?", req.body.id);


                req.session.idx = rows[0].idx;
                req.session.mid = rows[0].id;
                req.session.name1 = rows[0].name1;
                req.session.level1 = rows[0].level1;
                req.session.filename0 = rows[0].filename0;

                if (req.body.remember == 1) {
                    res.cookie('id', rows[0].id, {
                        maxAge: 60 * 60 * 1000,
                        httpOnly: true,
                        path: '/'
                    });
                    res.cookie('pw', req.body.pw, {
                        maxAge: 60 * 60 * 1000,
                        httpOnly: true,
                        path: '/'
                    });
                } else {
                    res.clearCookie('id', {
                        path: '/'
                    });
                    res.clearCookie('pw', {
                        path: '/'
                    });
                }

                req.session.save(function() {
                    res.redirect('/admin');
                });
            } else {
                res.send('<script type="text/javascript">alert("아이디/패스워드가 일치 하지 않습니다.");history.back();</script>');
                return;
            }
        } else {
            console.log('err', err);
            res.send(err);
        }
    });
});



router.get('/my_profile', userChecking, function(req, res, next) {
    const sql = "SELECT * FROM MEMB_tbl WHERE idx = ?";

    db.query(sql, req.session.idx, function(err, rows, fields) {
        if (!err) {
            res.render('./admin/my_profile', {
                myinfo: rows[0],
            });

            req.session.idx = rows[0].idx;
            req.session.mid = rows[0].id;
            req.session.name1 = rows[0].name1;
            req.session.level1 = rows[0].level1;
            req.session.filename0 = rows[0].filename0;

            req.session.save();
        } else {
            console.log(err);
        }
    });
});


router.get('/page/:page/:menu1/:menu2', userChecking, function(req, res, next) {
    console.log(req.session);
    res.render('./admin/' + req.params.page, {
        myinfo: req.session,
        board_id: req.params.page,
        menu1: req.params.menu1,
        menu2: req.params.menu2,
    });
});

// GET 는 query 로 받는다!!!
router.get('/delete_menu', userChecking, function(req, res, next) {
    var idx = req.query.idx;
    db.query('DELETE FROM SAVE_MENU_tbl WHERE idx = ?', idx, function(err, rows, fields) {
        if (!err) {
            res.redirect('/admin');
        } else {
            console.log('err', err);
            res.send(err);
        }
    });
});

router.get('/codes', userChecking, async function(req, res, next) {
    var step2Arr = [];
    var step3Arr = [];
    var arr = [];
    await new Promise(function(resolve, reject) {
        const sql = `SELECT sort1 as data, code1 as id, name1 as text FROM CODES_tbl WHERE LENGTH(code1) = 2 ORDER BY sort1 DESC`;
        db.query(sql, function(err, rows, fields) {
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
        arr = await utils.nvl(data);
    });
    for (var step1 of arr) {
        await new Promise(function(resolve, reject) {
            const sql = `SELECT sort1 as data, code1 as id, name1 as text FROM CODES_tbl WHERE LEFT(code1, 2) = ? AND LENGTH(code1) = 4 ORDER BY sort1 DESC`;
            db.query(sql, step1.id, function(err, rows, fields) {
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
            step2Arr = await utils.nvl(data);
        });
        step1.children = [];
        for (step2 of step2Arr) {
            await new Promise(function(resolve, reject) {
                const sql = `SELECT sort1 as data, code1 as id, name1 as text FROM CODES_tbl WHERE LEFT(code1, 4) = ? AND LENGTH(code1) = 6 ORDER BY sort1 DESC`;
                db.query(sql, step2.id, function(err, rows, fields) {
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
                step3Arr = await utils.nvl(data);
            });
            step2.children = [];
            for (step3 of step3Arr) {
                step2.children.push(step3);
            }
            step1.children.push(step2);
        }
    }
    res.send({
        id: 'root',
        text: '코드',
        children: arr
    });
});

router.post('/add_code', userChecking, async function(req, res, next) {
    const parentCode = req.body.parent_code;
    const codeLength = parentCode.length;
    var code = '';
    var sort = 0;

    var sql = '';
    if (parentCode == 'root') {
        sql = ` SELECT code1, sort1 FROM CODES_tbl WHERE LENGTH(code1) = 2 ORDER BY code1 DESC LIMIT 0, 1`;
    } else {
        sql = ` SELECT code1, sort1 FROM CODES_tbl WHERE LEFT(code1, ${codeLength}) = ? AND LENGTH(code1) = ${codeLength+2} ORDER BY code1 DESC LIMIT 0, 1`;
    }
    console.log(sql, parentCode);
    await new Promise(function(resolve, reject) {
        db.query(sql, parentCode, function(err, rows, fields) {
            if (!err) {
                resolve(rows[0]);
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });
    }).then(async function(data) {
        console.log(data);
        // code = data.code1.substr(data.code1.length - 1, 2);
        if (data) {
            console.log(data.code1.length);
            if (data.code1.length == 2) {
                sort = 999;
                code = eval(data.code1) + 1;
                if (code < 10) {
                    code = `0${code}`;
                }
                db.query(`INSERT INTO CODES_tbl SET code1 = ?, name1 = ?, sort1 = ?`, [code, code, sort]);

            } else if (data.code1.length == 4) {
                sort = eval(data.sort1) - 1;
                code = data.code1.substr(2, 2);
                code = eval(code) + 1;
                if (code < 10) {
                    code = `0${code}`;
                }
                code = `${parentCode}${code}`;
                db.query(`INSERT INTO CODES_tbl SET code1 = ?, name1 = ?, sort1 = ?`, [code, code, sort]);
            } else if (data.code1.length == 6) {
                sort = eval(data.sort1) - 1;
                code = data.code1.substr(4, 2);
                code = eval(code) + 1;
                if (code < 10) {
                    code = `0${code}`;
                }
                code = `${parentCode}${code}`;
                db.query(`INSERT INTO CODES_tbl SET code1 = ?, name1 = ?, sort1 = ?`, [code, code, sort]);
            }
        } else {
            if (parentCode == 'root') {
                sort = 999;
                code = '01';
            } else if (parentCode.length == 2) {
                sort = 999;
                code = `${parentCode}01`;
            } else if (parentCode.length == 4) {
                sort = 999;
                code = `${parentCode}01`;
            } else {
                return;
            }
            db.query(`INSERT INTO CODES_tbl SET code1 = ?, name1 = ?, sort1 = ?`, [code, code, sort]);
        }
    });

    res.send({
        code: code,
    });
});

router.post('/modify_code', userChecking, async function(req, res, next) {
    const { code1, name1, sort1 } = req.body;
    await new Promise(function(resolve, reject) {
        const sql = ` UPDATE CODES_tbl SET name1 = ?, sort1 = ? WHERE code1 = ? `;
        db.query(sql, [name1, sort1, code1], function(err, rows, fields) {
            if (!err) {
                resolve(rows);
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });
    }).then(async function(data) {
        res.send({ code: 1 });
    });
});

router.post('/delete_code', userChecking, async function(req, res, next) {
    const code1 = req.body.code1;
    await new Promise(function(resolve, reject) {
        const sql = ` DELETE FROM CODES_tbl WHERE code1 = ? `;
        db.query(sql, code1, function(err, rows, fields) {
            if (!err) {
                resolve(rows);
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });
    }).then(async function(data) {
        res.send({ code: 1 });
    });
});

router.get('/get_code_data_count', async function(req, res, next) {
    const code1 = req.query.code1;
    await new Promise(function(resolve, reject) {
        const sql = ` SELECT count(*) as cnt FROM QUIZ_tbl WHERE code1 = ? `;
        db.query(sql, code1, function(err, rows, fields) {
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
        res.send({ cnt: data.cnt });
    });
});



function replaceAll(str, searchStr, replaceStr) {
    return str.split(searchStr).join(replaceStr);
}

module.exports = router;
