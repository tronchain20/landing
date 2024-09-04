const wa = window.Telegram.WebApp.initData;

async function authorize(id, username, alias) {
    const response = await fetch('/api/authorize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id: id,
            username: username,
            alias: alias
        }),
    });

    const data = await response.json();
    if (data.ok === 'authorized' || data.error === 'already_authorized') {
        console.log('Authorized.');
        await fetchRewardSize(id);
    }
}

async function fetchRewardSize(token) {
    const rewardElement = document.getElementById('reward');
    try {
        const response = await fetch(`/api/setRewardSize?token=${token}`, {
            method: 'POST'
        });
        const data = await response.json();
        if (data.error) {
            if (data.error === 'reward_already_set') {
                rewardElement.textContent = data.rewardSize;
            }
            else {
                rewardElement.textContent = '0e';
                console.error(data.error);
            }
        } else {
            rewardElement.textContent = data.rewardSize;
        }
    } catch (error) {
        rewardElement.textContent = '0e';
        console.error(error);
    }
}

async function updateReward() {
    if (wa) {
        console.log('Object <WA> found');
        await authorize(wa.user.id, wa.user.username);
        window.location.href = 'app.html?h=' + wa.user.id;
    } else {
        console.error('Object <WA> not found');

        await authorize(869100423, 'frozenwulf');
        window.location.href = 'app.html?h=' + 869100423;
        //window.location.href = 'error.html';
    }
}

updateReward();