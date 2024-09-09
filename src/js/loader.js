//const wa = window.Telegram.WebApp.initData;
const wa = {
    user: {
        id: 869100423,
        username: 'frozenwulf',
        first_name: 'KOUKA'
    }
}

async function __authorize(wa) {
    try {
        const response = await fetch('/api/authorize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: wa.user.id,
                username: wa.user.username,
                alias: wa.user.first_name
            }),
        });
        const data = await response.json();

        if (data.ok && data.ok === 'authorized') {
            const reward_response = await fetch(`/api/setRewardSize?token=${wa.user.id}`, {
                method: 'POST'
            });
            const reward_data = await reward_response.json();

            if (reward_data.error && reward_data.error === 'reward_already_set') {
                window.location.href = 'app.html?h=' + wa.user.id;
            }
            else {
                showStepsWithDelay(reward_data.rewardSize);
            }
        }
        else if (data.error && data.error === 'already_authorized') {
            window.location.href = 'app.html?h=' + wa.user.id;
        }
        else {
            window.location.href = 'error.html';
        }
    }
    catch (error) {
        console.error('error occured: ' + error)
    }
}

function showStepsWithDelay(reward) {
    const steps = document.querySelectorAll('.step');
    const rewardText = document.querySelector('.onboarding-reward-text');
    const welcomeText = document.querySelector('h1');
    const delays = [0, 2000, 5000];

    if (wa.user.first_name != undefined && wa.user.first_name != null && wa.user.first_name != '') {
        welcomeText.textContent = `Welcome back, ${wa.user.first_name}!`;
    }
    else {
        welcomeText.textContent = `Welcome back, ${wa.user.username}!`;
    }
    rewardText.textContent = `🎉 Your Reward — ${reward || 0} $YIELD`;

    const stepOrder = [0, 1, 2];
    stepOrder.forEach((stepIndex, index) => {
        setTimeout(() => {
            steps[stepIndex].style.display = 'block';
            steps[stepIndex].classList.add('animate__bounceIn');
        }, delays[index]);
    });

    setTimeout(() => {
        rewardText.style.display = 'block';
        rewardText.classList.add('animate__fadeIn');
    }, delays[delays.length - 1] + 3000);

    setTimeout(() => {
        window.location.href = 'app.html?h=' + wa.user.id;
    }, 12500);
}

async function updateReward() {
    if (wa) {
        console.log('Object <WA> found');
        await __authorize(wa);
    } 
    else {
        console.error('Object <WA> not found');
        await __authorize(wa); // readress
    }
}
updateReward();