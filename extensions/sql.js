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

async function makeProfile(telegram_id, telegram_username, alias) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./core.sqlite3');
        db.run(`INSERT INTO landing(telegram_id, telegram_username, alias, timestamp) VALUES(?, ?, ?, ?)`, 
            [
                telegram_id,
                telegram_username,
                alias,
                Math.floor(Date.now() / 1000), 
            ], function(err) {
            
            if (err) {
                console.error('[LANDING] Error occured: ' + err);
                reject(err)
            }

            console.log(`[LANDING] Created <ID: ${telegram_id}>.`);
            resolve(true);
        });
        db.close();
    });
}

async function isUserExists(telegram_id) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./core.sqlite3');
        db.get(`SELECT 1 FROM landing WHERE telegram_id = ?`, [telegram_id], (err, row) => {     
            if (err) {
                console.error('[LANDING]  Error occured: ' + err);
                reject(err);
            }
      
            if (row !== undefined) {
                console.log(`[LANDING] Found <ID: ${telegram_id}>.`);
                resolve(true);
            }
            else {
                console.log(`[LANDING] Not found <ID: ${telegram_id}>.`);
                resolve(false);
            }
        });
        db.close();
    });
}

function updateParameter(telegram_id, parameter, newValue) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./core.sqlite3');
        db.run(`UPDATE landing SET ${parameter} = ? WHERE telegram_id = ?`, [newValue, telegram_id], function(err) {
            
            if (err) {
                console.log(`[LANDING] Error occured: <${parameter}> for <ID: ${telegram_id}>: ` + err);
                reject('error');
            }

            console.log(`[LANDING] Updated <${parameter}> for <ID: ${telegram_id}>.`);
            resolve(true);
        });
        db.close();
    });
}

function fetchParameter(telegram_id, parameter) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database('./core.sqlite3');
        db.get(`SELECT ${parameter} FROM landing WHERE telegram_id = ?`, [telegram_id], function(err, row) {
            
            if (err) {
                console.log(`[LANDING] Error occured: <${parameter}> for <ID: ${telegram_id}>: ` + err);
                reject('error');
            }

            if (row[parameter] != null) {
                resolve(row[parameter]);
            }
            else {
                resolve(false);
            }
            console.log(`[LANDING] Fetched <${parameter}> for <ID: ${telegram_id}>.`);
        });
        db.close();
    });
}

module.exports = {
    runQuery,
    isUserExists,
    updateParameter,
    fetchParameter,
    makeProfile
}