require('dotenv').config();
const { Bot, GrammyError, HttpError, InputFile, session, InlineKeyboard } = require('grammy');
const sql = require('./telegramSQL.js');
const landing_sql = require('../extensions/sql.js');
const fs = require('fs').promises;

async function getTimers() {
    try {
        const data = await fs.readFile('./telegram/timers.json', 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        throw new Error(`Error reading timers file: ${error.message}`);
    }
}

async function writeTimers(timers) {
    try {
        const data = JSON.stringify(timers, null, 2);
        await fs.writeFile('./telegram/timers.json', data, 'utf-8');
    } catch (error) {
        throw new Error(`Error writing timers file: ${error.message}`);
    }
}

function getRandomEnabledTimer(timers) {
    const enabledTimers = Object.values(timers).filter(timer => timer.enabled);

    if (enabledTimers.length === 0) {
        return null;
    }

    const randomIndex = Math.floor(Math.random() * enabledTimers.length);
    return enabledTimers[randomIndex];
}

async function executeTask() {
    try {
        console.log('Executing AD at:', new Date().toLocaleString());

        const timers = await getTimers();
        const timer = getRandomEnabledTimer(timers);

        let index = 0;
        let errors = 0;

        const users = await sql.runQuery('SELECT telegram_id FROM landing UNION SELECT telegram_id FROM bot;');
        await users.forEach(async _user => {
            try {
                await bot.api.sendPhoto(_user.telegram_id, new InputFile(timer.image), {
                    caption: timer.text,
                    parse_mode: 'Markdown'
                });
                await index++;
            }
            catch {
                await errors++;
            }

            if (index + 1 === users.length) {
                await bot.api.sendMessage(process.env.TELEGRAM_ADMIN, `✅ Рассылка по таймеру завершена.\nВсего пользователей: ${users.length}\nОтправлено: ${index}\nНе удалось отправить: ${errors}`);
            }
        });
    } catch (error) {
        console.error('Error executing task:', error);
    }
}

async function startTimer() {
    console.log('Counting timers...')
    setInterval(await executeTask, 3 * 60 * 60 * 1000);
}

const bot = new Bot(process.env.TELEGRAM_BOT_API);

async function polling() {
    console.log(`[BOT] Polling with: ${process.env.TELEGRAM_BOT_API}`);

    bot.use(session({ initial: () => ({ 
            step: 'idle',
            ad_text: null,
            ad_btn_caption: null
        })
    }));

    bot.command('start', async (ctx) => {

        if (!await sql.isProfileExists(ctx.from.id)) {
            if (ctx.message.text.includes('ref')) {
                let ref_target;
                try {
                    ref_target = ctx.message.text.replace('/start ref_', '');
                    let referals = await landing_sql.fetchParameter(ref_target, 'referals');
                    const reward = await landing_sql.fetchParameter(ref_target, 'reward');

                    if (referals === '[]') {
                        referals = [ctx.from.id];
                    }
                    else {
                        const massive = JSON.parse(referals);
                        massive.push(ctx.from.id);
                        referals = massive;
                    }

                    await landing_sql.runQuery('UPDATE landing SET referals = ? WHERE telegram_id = ?', [
                        JSON.stringify(referals),
                        ref_target
                    ]);

                    await landing_sql.runQuery('UPDATE landing SET reward = ? WHERE telegram_id = ?', [
                        reward + parseInt(process.env.REFERAL_REWARD),
                        ref_target
                    ]);
                }
                catch (error) {
                    console.log('Skipping referal: ' + error);
                }

                if (!await sql.makeProfile(ctx.from.id, ctx.from.username)) {
                    await ctx.reply('🚫 Sorry, an error was occured, try again later...');
                    return;
                }
            }
        }

        await ctx.replyWithPhoto(new InputFile('./telegram/images/welcome.png'), 
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Join our community', url: process.env.TELEGRAM_COMMUNITY_URL }],
                    [{ text: 'Open app', url: process.env.TELEGRAM_WEBAPP_URL }],
                ]
            }
        });
    });

    bot.command('admin', async (ctx) => {

        if (ctx.from.id != process.env.TELEGRAM_ADMIN) {
            return;
        }

        await ctx.reply('💠 Админ-панель', 
        {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '📊 Статистика', callback_data: 'stats' }],
                    [{ text: '🎁 Настройка таймеров', callback_data: 'setting_up_timers' }],
                    [{ text: '🚀 Рассылка (текст)', callback_data: 'ad_text' }],
                    [{ text: '🚀 Рассылка (GIF + текст)', callback_data: 'ad_gif' }],
                    [{ text: '🚀 Рассылка (фото + текст)', callback_data: 'ad_photo' }],
                    [{ text: '🚀 Рассылка (кнопка + текст)', callback_data: 'ad_btn' }]
                ]
            }
        });
    });

    bot.callbackQuery('setting_up_timers', async (ctx) => {
        await ctx.deleteMessage();            

        const keyboard = new InlineKeyboard();
        keyboard.text('Таймер №1', 'timer_1').row();
        keyboard.text('Таймер №2', 'timer_2').row();
        keyboard.text('Таймер №3', 'timer_3').row();

        await ctx.reply(`Выберите таймер для настройки`, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

        await ctx.answerCallbackQuery();
    });

    bot.callbackQuery('stats', async (ctx) => {
        await ctx.deleteMessage();

        const query = `
            SELECT COUNT(*) AS total_users,
                COUNT(CASE WHEN datetime(timestamp, 'unixepoch') >= date('now', 'localtime') THEN 1 END) AS users_today,
                COUNT(CASE WHEN datetime(timestamp, 'unixepoch') >= date('now', '-1 day', 'localtime') THEN 1 END) AS users_yesterday,
                COUNT(CASE WHEN datetime(timestamp, 'unixepoch') >= date('now', '-7 days', 'localtime') THEN 1 END) AS users_last_week,
                COUNT(CASE WHEN datetime(timestamp, 'unixepoch') >= date('now', '-30 days', 'localtime') THEN 1 END) AS users_last_month
            FROM (
                SELECT timestamp FROM landing
                UNION
                SELECT timestamp FROM bot
            );
        `;
    
        const stats = await sql.runQuery(query);

        await ctx.reply(`<b>📊 Статистика (Общая)</b>\n\nВсего пользователей: <b>${stats[0].total_users}</b>\nЗа сегодня: <b>${stats[0].users_today}</b>\nЗа вчера: <b>${stats[0].users_yesterday}</b>\nЗа эту неделю: <b>${stats[0].users_last_week}</b>\nЗа этот месяц: <b>${stats[0].users_last_month}</b>`, {
            parse_mode: 'HTML'
        });

        await ctx.answerCallbackQuery();
    });

    bot.callbackQuery('ad_gif', async (ctx) => {
        await ctx.deleteMessage();

        const msg = await ctx.reply('Введите текст (поддержка ТОЛЬКО форматирования Telegram) или отмена');
        ctx.session.step = `ad_gif_awaiting_${msg.message_id}`;

        await ctx.answerCallbackQuery();
    });

    bot.callbackQuery('ad_text', async (ctx) => {
        await ctx.deleteMessage();

        const msg = await ctx.reply('Введите текст (поддержка ТОЛЬКО форматирования Telegram) или отмена');
        ctx.session.step = `ad_text_awaiting_${msg.message_id}`;

        await ctx.answerCallbackQuery();
    });

    bot.callbackQuery('ad_photo', async (ctx) => {
        await ctx.deleteMessage();

        const msg = await ctx.reply('Введите текст (поддержка ТОЛЬКО форматирования Telegram) или отмена');
        ctx.session.step = `ad_photo_awaiting_${msg.message_id}`;

        await ctx.answerCallbackQuery();
    });

    bot.callbackQuery('ad_btn', async (ctx) => {
        await ctx.deleteMessage();

        const msg = await ctx.reply('Введите текст (поддержка ТОЛЬКО форматирования Telegram) или отмена');
        ctx.session.step = `ad_btn_awaiting_${msg.message_id}`;

        await ctx.answerCallbackQuery();
    });

    bot.on('message:animation', async (ctx) => {
        await ctx.deleteMessage();
        if (ctx.session.step === 'gif') {

            let index = 0;
            let errors = 0;

            const users = await sql.runQuery('SELECT telegram_id FROM landing UNION SELECT telegram_id FROM bot;');
            await users.forEach(async _user => {
                try {
                    await ctx.api.sendAnimation(_user.telegram_id, ctx.message.animation.file_id, {
                        caption: ctx.session.ad_text,
                        parse_mode: 'Markdown'
                    });
                    await index++;
                }
                catch {
                    await errors++;
                }

                if (index + 1 === users.length) {
                    await ctx.replyWithAnimation(ctx.message.animation.file_id, {
                        caption: `✅ Рассылка завершена.\nВсего пользователей: ${users.length}\nОтправлено: ${index}\nНе удалось отправить: ${errors}\n\n${ctx.session.ad_text}`,
                        parse_mode: 'Markdown'
                    });
                    ctx.session.step = 'idle';
                    ctx.session.ad_text = null;
                }
            });
        }
    });

    bot.on('message:photo', async (ctx) => {
        await ctx.deleteMessage();
        if (ctx.session.step === 'photo') {

            let index = 0;
            let errors = 0;

            const users = await sql.runQuery('SELECT telegram_id FROM landing UNION SELECT telegram_id FROM bot;');
            await users.forEach(async _user => {
                try {
                    await ctx.api.sendPhoto(_user.telegram_id, ctx.message.photo[0].file_id, {
                        caption: ctx.session.ad_text,
                        parse_mode: 'Markdown'
                    });
                    await index++;
                }
                catch {
                    await errors++;
                }

                if (index + 1 === users.length) {
                    await ctx.replyWithPhoto(ctx.message.photo[0].file_id, {
                        caption: `✅ Рассылка завершена.\nВсего пользователей: ${users.length}\nОтправлено: ${index}\nНе удалось отправить: ${errors}\n\n${ctx.session.ad_text}`,
                        parse_mode: 'Markdown'
                    });
                    ctx.session.step = 'idle';
                    ctx.session.ad_text = null;
                }
            });
        }
    });

    bot.on('message:text', async (ctx) => {
        await ctx.deleteMessage();

        if (ctx.session.step.includes('ad_text_awaiting')) {
            const msgid = ctx.session.step.replace('ad_text_awaiting_', '');
            await ctx.api.deleteMessage(ctx.from.id, msgid);

            if (ctx.message.text.toLowerCase() === 'отмена') {
                ctx.session.step = 'idle';
                await ctx.reply('Рассылка отменена');
                return;
            }

            let index = 0;
            let errors = 0;

            const users = await sql.runQuery('SELECT telegram_id FROM landing UNION SELECT telegram_id FROM bot;');
            await users.forEach(async _user => {
                try {
                    await ctx.api.sendMessage(_user.telegram_id, ctx.message.text, {
                        parse_mode: 'Markdown'
                    });
                    await index++;
                }
                catch {
                    await errors++;
                }

                if (index + 1 === users.length) {
                    await ctx.reply(`✅ Рассылка завершена.\nВсего пользователей: ${users.length}\nОтправлено: ${index}\nНе удалось отправить: ${errors}\n\n${ctx.message.text}`, {
                        parse_mode: 'Markdown'
                    });
                    ctx.session.step = 'idle';
                }
            });
        }
        else if (ctx.session.step.includes('ad_gif_awaiting')) {
            const msgid = ctx.session.step.replace('ad_gif_awaiting_', '');
            await ctx.api.deleteMessage(ctx.from.id, msgid);

            if (ctx.message.text.toLowerCase() === 'отмена') {
                ctx.session.step = 'idle';
                await ctx.reply('Рассылка отменена');
                return;
            }

            await ctx.reply('Отправьте GIF');
            ctx.session.ad_text = ctx.message.text;
            ctx.session.step = 'gif';
        }
        else if (ctx.session.step.includes('ad_photo_awaiting')) {
            const msgid = ctx.session.step.replace('ad_photo_awaiting_', '');
            await ctx.api.deleteMessage(ctx.from.id, msgid);

            if (ctx.message.text.toLowerCase() === 'отмена') {
                ctx.session.step = 'idle';
                await ctx.reply('Рассылка отменена');
                return;
            }

            await ctx.reply('Отправьте фото');
            ctx.session.ad_text = ctx.message.text;
            ctx.session.step = 'photo';
        }
        else if (ctx.session.step.includes('ad_btn_awaiting')) {
            const msgid = ctx.session.step.replace('ad_btn_awaiting_', '');
            await ctx.api.deleteMessage(ctx.from.id, msgid);

            if (ctx.message.text.toLowerCase() === 'отмена') {
                ctx.session.step = 'idle';
                await ctx.reply('Рассылка отменена');
                return;
            }

            const msg = await ctx.reply('Введите название кнопки');
            ctx.session.ad_text = ctx.message.text;
            ctx.session.step = `btn_${msg.message_id}`;
        }
        else if (ctx.session.step.includes('btn')) {
            const msgid = ctx.session.step.replace('btn_', '');
            await ctx.api.deleteMessage(ctx.from.id, msgid);

            if (ctx.message.text.toLowerCase() === 'отмена') {
                ctx.session.step = 'idle';
                ctx.session.ad_text = null;
                await ctx.reply('Рассылка отменена');
                return;
            }

            const msg = await ctx.reply('Введите ссылку для кнопки');
            ctx.session.ad_btn_caption = ctx.message.text;
            ctx.session.step = `url_${msg.message_id}`;
        }
        else if (ctx.session.step.includes('url')) {
            const msgid = ctx.session.step.replace('url_', '');
            await ctx.api.deleteMessage(ctx.from.id, msgid);

            if (ctx.message.text.toLowerCase() === 'отмена') {
                ctx.session.step = 'idle';
                ctx.session.ad_text = null;
                ctx.session.ad_btn_caption = null;
                await ctx.reply('Рассылка отменена');
                return;
            }

            const keyboard = new InlineKeyboard();
            keyboard.url(ctx.session.ad_btn_caption, ctx.message.text).row();

            let index = 0;
            let errors = 0;

            const users = await sql.runQuery('SELECT telegram_id FROM landing UNION SELECT telegram_id FROM bot;');
            await users.forEach(async _user => {
                try {
                    await ctx.api.sendMessage(_user.telegram_id, ctx.session.ad_text, {
                        parse_mode: 'Markdown',
                        reply_markup: keyboard
                    });
                    await index++;
                }
                catch {
                    await errors++;
                }

                if (index + 1 === users.length) {
                    await ctx.reply(`✅ Рассылка завершена.\nВсего пользователей: ${users.length}\nОтправлено: ${index}\nНе удалось отправить: ${errors}\n\n${ctx.session.ad_text}`, {
                        reply_markup: keyboard,
                        parse_mode: 'Markdown'
                    });
                    ctx.session.step = 'idle';
                    ctx.session.ad_text = 'idle';
                    ctx.session.ad_btn_caption = 'idle';
                }
            });
        }
        else if (ctx.session.step.includes('timer_text')) {
            if (ctx.message.text.toLowerCase() === 'отмена') {
                ctx.session.step = 'idle';
                await ctx.reply('Изменение текста таймера отменено');
                return;
            }

            const timer = ctx.session.step.replace('timer_text_', '');
            const timersSettings = await getTimers();
            timersSettings[timer].text = ctx.message.text;
            await writeTimers(timersSettings);

            const keyboard = new InlineKeyboard();
            keyboard.text('⬅️ Назад к таймерам', 'setting_up_timers').row();
            await ctx.reply(`Вы изменили текст таймера`, {
                reply_markup: keyboard
            });
            ctx.session.step = 'idle';
        }
    });

    bot.on('callback_query:data', async (ctx) => {

        await ctx.deleteMessage();

        const callbackData = ctx.callbackQuery.data;
        if (callbackData.startsWith('timer_')) {
            const timer = callbackData.replace('timer_', '');
            const timersSettings = await getTimers();

            const keyboard = new InlineKeyboard();
            keyboard.text('🚫 Включить/выключить таймер', `switch_timer${timer}`).row();
            keyboard.text('📝 Изменить текст таймера', `edit_text_timer${timer}`).row();
            keyboard.text('⬅️ Назад к таймерам', 'setting_up_timers').row();

            await ctx.reply(`⏰ *Таймер №${timer}*\n\nСтатус: *${(timersSettings['timer' + timer]['enabled'] ? 'Включен' : 'Выключен')}*\nДействует каждые *${timersSettings['timer' + timer]['time'] / 60000}* мин.\nТекст: ${timersSettings['timer' + timer]['text']}\n\nВсе таймеры поддерживают разметку Markdown и смайлики`, {
                reply_markup: keyboard,
                parse_mode: 'Markdown'
            });
        }
        else if (callbackData.startsWith('switch_timer')) {
            const timer = callbackData.replace('switch_', '');
            const timersSettings = await getTimers();

            if (timersSettings[timer].enabled) {
                timersSettings[timer].enabled = false;
            }
            else {
                timersSettings[timer].enabled = true;
            }

            const keyboard = new InlineKeyboard();
            keyboard.text('⬅️ Назад к таймерам', 'setting_up_timers').row();

            await writeTimers(timersSettings);
            await ctx.reply(`Вы ${timersSettings[timer].enabled ? 'включили' : 'выключили'} таймер`, {
                reply_markup: keyboard
            });
        }
        else if (callbackData.startsWith('edit_text_timer')) {
            const timer = callbackData.replace('edit_text_', '');

            ctx.session.step = `timer_text_${timer}`
            await ctx.reply(`Введите новый текст для таймера или отмена. Поддержка Markdown включена`);
        }
    });

    bot.catch((err) => {
        const ctx = err.ctx;
        console.error(`Error while handling update ${ctx.update.update_id}:`);
        const e = err.error;
        if (e instanceof GrammyError) {
          console.error("Error in request:", e.description);
        } else if (e instanceof HttpError) {
          console.error("Could not contact Telegram:", e);
        } else {
          console.error("Unknown error:", e);
        }
    });

    bot.start();

    startTimer();
}

module.exports = polling;