const cron = require('node-cron');
const moment = require('moment');
const db = require('./db');
const utils = require('./Utils');

function start() {
    console.log('start', moment().format('YYYY-MM-DD HH:mm:ss'));
    var arr = [];
    cron.schedule('30 12 1-31 * *', function () {
        console.log('30분 12시 매일 작업 실행', moment().format('YYYY-MM-DD HH:mm:ss'));

        const sql = `SELECT type1, susul_date, id, fcm FROM MEMB_tbl WHERE fcm != '' `;
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
                    if (obj.type1 == 1) {
                        utils.sendPush(fcmArr, `${afterWeek}주차 알림`, `${afterWeek} 주차 알림 메시지`);
                    } else {
                        utils.sendPush(fcmArr, `근감소증 알림`, `근감소 방지를 위해 꾸준히 운동을 해주세요.`);
                    }

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
