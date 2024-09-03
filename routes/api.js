const express = require('express');
const router = express.Router();
const helper = require('../extensions/helper.js');

router.get('/setRewardSize', (req, res) => {
    const token = req.query.token;
    if (token === undefined) {
        res.json({ 
            error: 'no_such_token' 
        });
    }
    else {
        res.json({ 
            rewardSize: helper.getRandomNumber(1000, 10000),
            token: token
        });
    }
});

module.exports = router;