const cron = require('node-cron');
const moment = require('moment');
const db = require('./db');
const utils = require('./Utils');

function start() {
    console.log('start', moment().format('YYYY-MM-DD HH:mm:ss'));
    var arr = [];
    cron.schedule('30 15 1-31 * *', function () {
        console.log('30분 15시 매일 작업 실행', moment().format('YYYY-MM-DD HH:mm:ss'));

        const sql = `SELECT susul_date, id, fcm FROM MEMB_tbl WHERE type1 = 1 `;
        db.query(sql, async function(err, rows, fields) {
            // console.log(rows);
            if (!err) {
                for (obj of rows) {
                    const source = moment(obj.susul_date);
                    const desti = moment();
                    const afterWeek = desti.diff(source, 'week') + 1;
                    // console.log(obj.id, afterWeek);
                    var fcmArr = [];
                    fcmArr.push(obj.fcm);
                    utils.sendPush(fcmArr, `${afterWeek}주차 알림`, `${afterWeek} 주차 알림 메시지`);
                }
            } else {
                console.log(err);
                res.send(err);
                return;
            }
        });

    });


}




module.exports = {
    start: start
}
