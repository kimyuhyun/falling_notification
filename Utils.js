const fs = require('fs');
const db = require('./db');
const axios = require('axios');

class Utils {
    ///null 값은 빈값으로 처리해준다!!
    async nvl(arr) {
        if (arr == null) {
            return arr;
        }

        if (arr.length != null) {
            for (var rows of arr) {
                for (var i in rows) {
                    if (rows[i] == null || rows[i] == 'null') {
                        rows[i] = '';
                    }
                }
            }
        } else {
            for (var i in arr) {
                if (arr[i] == null || arr[i] == 'null') {
                    arr[i] = '';
                }
            }
        }
        return arr;
    }

    async sendPush(fcmArr, title, body) {
        var fields = {};
        fields.priority = 'high';
        fields.registration_ids = fcmArr;

        fields.data = {};
        fields.data.title = title;
        fields.data.body = body;

        var config = {
            method: 'post',
            url: 'https://fcm.googleapis.com/fcm/send',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'key=' + process.env.FCM_SERVER_KEY
            },
            data: JSON.stringify(fields),
        };

        await axios(config).then(function (response) {
            //알림내역저장
            if (response.data.success == 1) {
                const sql = 'INSERT INTO PUSH_HISTORY_tbl SET title = ?, body = ?, created = NOW()';
                db.query(sql, [fields.data.title, fields.data.body]);
            }
            //

            console.log(response.data);
        }).catch(function (error) {
            console.log(error);
        });
    }
}

module.exports = new Utils();
