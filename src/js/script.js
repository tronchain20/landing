const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('h');

document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = document.querySelectorAll('.page');
    const slider = document.querySelector('.slider');

    function updateSliderPosition(item) {
        const itemRect = item.getBoundingClientRect();
        const menuRect = item.parentElement.getBoundingClientRect();
        slider.style.left = `${itemRect.left - menuRect.left + (itemRect.width - slider.offsetWidth) / 2}px`;
    }

    // тут ниче не трогай родной
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');

            menuItems.forEach(mi => mi.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(pageId).classList.add('active');

            updateSliderPosition(this);
        });
    });

    updateSliderPosition(document.querySelector('.menu-item.active'));

    // Санек сюда короче добавляй функцию телеграмовскую инвайта в апку (найдешь в доке)
    const inviteButton = document.querySelector('.invite-button');
    inviteButton.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/getLinks?token=' + token);
            const data = await response.json();

            if (data.error) {
                console.error('Error fetching links: ' + error)
                return;
            }
            else {
                window.location.href = data.share;
            }
        }
        catch (error) {
            console.error('Error getting share link: ' + error)
        }
    });

    const copyLinkButton = document.querySelector('.copy-link-button');

    copyLinkButton.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/getLinks?token=' + token);
            const data = await response.json();

            if (data.error) {
                console.error('Error fetching links: ' + error);
                return;
            }
            else {
                await navigator.clipboard.writeText(data.ref);

                // Add the 'copied' class to the button
                copyLinkButton.classList.add('copied');

                // Reset the button state after 2 seconds
                setTimeout(() => {
                    copyLinkButton.classList.remove('copied');
                }, 2000);
            }
        }
        catch (error) {
            await navigator.clipboard.writeText('https://t.me');
            console.error('Error copying link to clipboard: ' + error)
        }
    });

    async function updatePageData() {
        try {
            const response = await fetch('/api/getUserData?token=' + token);
            const data = await response.json();

            if (data.error) {
                console.error('Error fetching user data: ' + data.error);
                return;
            }

            document.querySelector('.amount').textContent = Intl.NumberFormat('ru-RU').format(Number(data.reward)).replace(/,/g, ' ') || 0;
            document.querySelector('.usd-value').textContent = `~ ${Intl.NumberFormat('ru-RU').format(Number(data.reward_usd)).replace(/,/g, ' ')} USD` || `~ 0 USD`;
            document.querySelector('.invited-friends').textContent = data.friends.length || 0;

            const invitationList = document.querySelector('.invitation-list');
            data.friends.forEach(async friend => {

                const response = await fetch('/api/getDisplayData?token=' + friend);
                const friendData = await response.json();

                const invitationItem = document.createElement('div');
                invitationItem.className = 'invitation-item';

                const inviteeName = document.createElement('span');
                inviteeName.className = 'invitee-name';
                inviteeName.textContent = friendData.alias;

                const inviteeReward = document.createElement('span');
                inviteeReward.className = 'invitee-reward';
                inviteeReward.textContent = '10 000 $YIELD';

                invitationItem.appendChild(inviteeName);
                invitationItem.appendChild(inviteeReward);
                invitationList.appendChild(invitationItem);
            });
        }
        catch (error) {
            console.error('Error updating page data: ' + error);
        }
    }
    updatePageData();
});

async function createTasks() {
    const response = await fetch('/api/getUserData?token=' + token);
    const data = await response.json();

    const links = await fetch('/api/getLinks?token=' + token);		
    const links_data = await links.json();

    if (data.error) {
        console.error('Error fetching user data: ' + data.error);
        return;
    }

    const tasksContainer = document.querySelector('#tasks-page .tasks-list');
    const tasks = [
        { name: 'Join TON Community', reward: '1 000 $YIELD', completed: data.TONCommunity, icon: 'task1.svg', link: links_data.ton_community },
        { name: 'Join our Community', reward: '1 000 $YIELD', completed: data.Community, icon: 'task2.svg', link: links_data.community },
        { name: 'Invite friends', reward: '5 000 $YIELD for each friend', completed: (data.friends.length == 50 ? true : false), progress: data.friends.length, total: 50, icon: 'task3.svg' },
    ];

    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.classList.add('task-item');

        let statusHtml;
        if (task.progress !== undefined) {
            statusHtml = `<span class="task-status">${task.progress}/${task.total}</span>`;
        } else {
            statusHtml = `<span class="task-status ${task.completed ? 'completed' : 'join'}">${task.completed ? 'Completed' : 'Join'}</span>`;
        }

        taskElement.innerHTML = `
            <div class="task-icon">
                <img src="img/${task.icon}" alt="${task.name} icon">
            </div>
            <div class="task-info">
                <span class="task-name">${task.name}</span>
                <span class="task-reward">${task.reward}</span>
            </div>
            ${statusHtml}
        `;

        if (task.progress !== undefined) {
            const progressBar = document.createElement('div');
            progressBar.classList.add('task-progress-bar');
            const progress = document.createElement('div');
            progress.classList.add('task-progress');
            progress.style.width = `${(task.progress / task.total) * 100}%`;
            progressBar.appendChild(progress);
            taskElement.appendChild(progressBar);
        }

        if (!task.completed && task.link) {		
            const joinButton = taskElement.querySelector('.task-status.join');		
            if (joinButton) {
                joinButton.setAttribute('data-task-name', task.name);
                joinButton.addEventListener('click', () => {		
                    window.open(task.link, '_blank');
                    setTimeout(async () => {
                        const target = joinButton.getAttribute('data-task-name');
                        if (target === 'Join TON Community') {
                            await fetch(`/api/set?token=${token}&target=tc`);
                        }
                        else if (target === 'Join our Community') {
                            await fetch(`/api/set?token=${token}&target=c`);
                        }
                    }, 8000);
                });		
                joinButton.style.cursor = 'pointer';		
            }		
        }

        tasksContainer.appendChild(taskElement);
    });
}

document.addEventListener('DOMContentLoaded', createTasks);

// Pop-up код
const popup = document.getElementById('withdraw-popup');
const withdrawBtn = document.querySelector('.withdraw-button');
const closeBtn = document.querySelector('.close-popup');

withdrawBtn.onclick = function() {
    popup.style.display = "block";
    popup.classList.add('animate__animated', 'animate__fadeIn');
}

closeBtn.onclick = function() {
    popup.classList.remove('animate__fadeIn');
    popup.classList.add('animate__fadeOut');
    setTimeout(() => {
        popup.style.display = "none";
        popup.classList.remove('animate__fadeOut');
    }, 500);
}

window.onclick = function(event) {
    if (event.target == popup) {
        popup.classList.remove('animate__fadeIn');
        popup.classList.add('animate__fadeOut');
        setTimeout(() => {
            popup.style.display = "none";
            popup.classList.remove('animate__fadeOut');
        }, 500);
    }
}

// Copy helper
