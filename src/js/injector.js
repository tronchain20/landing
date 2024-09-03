const wa = window.Telegram.WebApp.initData;

if (wa) {
    console.log('Object <WA> found');
} 
else {
    console.error('Object <WA> not found');
    // window.location.href = 'error.html';
}