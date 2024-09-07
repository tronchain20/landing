const express = require('express');
const router = express.Router();
const helper = require('../extensions/helper.js');
const sql = require('../extensions/sql.js');

router.use(express.json())

router.post('/setRewardSize', async (req, res) => {
    const token = req.query.token;
    if (token === undefined) {
        res.json({ 
            error: 'token_empty' 
        });
    }
    else {

        if (!await sql.isUserExists(token)) {
            res.json({ 
                error: 'no_such_token' 
            });
            return;
        }
        else {
            const current_reward = await sql.fetchParameter(token, 'reward');
            if (current_reward != 0) {
                res.json({ 
                    error: 'reward_already_set',
                    rewardSize: current_reward
                });
                return;
            }

            const size = helper.getRandomNumber(5111, 26666);
            await sql.updateParameter(token, 'reward', size);

            res.json({
                rewardSize: size,
                token: token
            });
        }
    }
});

router.post('/authorize', async (req, res) => {
    if (req.body == undefined) {
        res.json({ 
            error: 'empty_body' 
        });
        return;
    }

    if (!await sql.isUserExists(req.body.id)) {
        await sql.makeProfile(req.body.id, req.body.username, req.body.alias);
        res.json({ 
            ok: 'authorized' 
        });
    }
    else {
        res.json({ 
            error: 'already_authorized' 
        });
    }
});

router.get('/getLinks', async (req, res) => {
    const token = req.query.token;
    if (token === undefined) {
        res.json({ 
            error: 'token_empty' 
        });
    }
    else {
        res.json({
            share: `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${process.env.TELEGRAM_BOT_NAME}/start=ref_${token}`)}&text=${encodeURIComponent(process.env.TELEGRAM_SHARE_BUTTON_TEXT)}`,
            ref: `https://t.me/${process.env.TELEGRAM_BOT_NAME}/start=ref_${token}`
        })
    }
});

router.get('/getUserData', async (req, res) => {
    const token = req.query.token;
    if (token === undefined) {
        res.json({ 
            error: 'token_empty' 
        });
    }
    else {
        res.json({
            
        })
    }
});

module.exports = router;