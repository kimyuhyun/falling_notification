const fs = require('fs');
const db = require('./db');

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
}

module.exports = new Utils();
