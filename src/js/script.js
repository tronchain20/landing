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

    // А тут Санечек в буфер обмена копируй ссылку васька инвайтовскую
    const copyLinkButton = document.querySelector('.copy-link-button');
    copyLinkButton.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/getLinks?token=' + token);
            const data = await response.json();
            
            if (data.error) {
                console.error('Error fetching links: ' + error)
                return;
            }
            else {
                await navigator.clipboard.writeText(data.ref);
                alert('Ссылка скопирована в буфер обмена');
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

    if (data.error) {
        console.error('Error fetching user data: ' + data.error);
        return;
    }

    const tasksContainer = document.querySelector('#tasks-page .tasks-list');
    const tasks = [
        { name: 'Join TON Community', reward: '1 000 $YIELD', completed: false, icon: 'task1.svg' },
        { name: 'Join our Community', reward: '1 000 $YIELD', completed: true, icon: 'task2.svg' },
        { name: 'Invite friends', reward: '5 000 $YIELD for each friend', completed: false, progress: data.friends.length, total: 50, icon: 'task3.svg' },
    ];

    tasks.forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.classList.add('task-item');

        let statusHtml;
        if (task.progress !== undefined) {
            statusHtml = `<span class="task-status">${task.progress}/${task.total}</span>`;
        } else {
            statusHtml = `<span class="task-status">${task.completed ? 'Completed' : 'Join'}</span>`;
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

        tasksContainer.appendChild(taskElement);
    });
}

document.addEventListener('DOMContentLoaded', createTasks);