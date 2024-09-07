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

            document.querySelector('.amount').textContent = data.amount || 0;
            document.querySelector('.usd-value').textContent = data.usdValue || 0;
            document.querySelector('.invited-friends').textContent = data.invitedFriends || 0;
        }
        catch (error) {
            console.error('Error updating page data: ' + error);
        }
    }
    updatePageData();
});
