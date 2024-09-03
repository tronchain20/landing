const sqlite3 = require('sqlite3');

async function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./core.sqlite3');
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
        db.close();
    });
}

async function isProfileExists(telegram_id) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./core.sqlite3');
        db.get(`SELECT 1 FROM bot WHERE telegram_id = ?`, [telegram_id], (err, row) => {     
            if (err) {
                console.error('[BOT]  Error occured: ' + err);
                reject(err);
            }
      
            if (row !== undefined) {
                console.log(`[BOT] Found <ID: ${telegram_id}>.`);
                resolve(true);
            }
            else {
                console.log(`[BOT] Not found <ID: ${telegram_id}>.`);
                resolve(false);
            }
        });
        db.close();
    });
}

async function makeProfile(telegram_id, telegram_username) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./core.sqlite3');
        db.run(`INSERT INTO bot(telegram_id, telegram_username, timestamp) VALUES(?, ?, ?)`, 
            [
                telegram_id,
                telegram_username,
                Math.floor(Date.now() / 1000), 
            ], function(err) {
            
            if (err) {
                console.error('[BOT] Error occured: ' + err);
                reject(err)
            }

            console.log(`[BOT] Created <ID: ${telegram_id}>.`);
            resolve(true);
        });
        db.close();
    });
}

function fetchProfileParameter(telegram_id, parameter) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./core.sqlite3');
        db.get(`SELECT ${parameter} FROM bot WHERE telegram_id = ?`, [telegram_id], function(err, row) {
            
            if (err) {
                console.log(`[BOT] Error occured: <${parameter}> for <ID: ${telegram_id}>: ` + err);
                reject('error');
            }

            if (row[parameter] != null) {
                resolve(row[parameter]);
            }
            else {
                resolve(false);
            }
            console.log(`[BOT] Fetched <${parameter}> for <ID: ${telegram_id}>.`);
        });
        db.close();
    });
}

module.exports = {
    runQuery,
    isProfileExists,
    makeProfile,
    fetchProfileParameter
}