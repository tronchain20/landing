require('dotenv').config();
const { Bot, GrammyError, HttpError, InputFile } = require('grammy');
const sql = require('./telegramSQL.js');
const landing_sql = require('../extensions/sql.js');

async function polling() {
    const bot = new Bot(process.env.TELEGRAM_BOT_API);
    console.log(`[BOT] Polling with: ${process.env.TELEGRAM_BOT_API}`);

    bot.command('start', async (ctx) => {

        if (!await sql.isProfileExists(ctx.from.id)) {
            if (ctx.message.text.includes('ref')) {
                let ref_target;
                try {
                    ref_target = ctx.message.text.replace('/start ref_', '');
                    let referals = await landing_sql.fetchParameter(ref_target, 'referals');

                    if (referals === '{}') {
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
                    [{ text: 'Open app', web_app: 
                    {
                        url: process.env.TELEGRAM_WEBAPP_URL
                    }}],
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
                    [{ text: '🚀 Рассылка (GIF)', callback_data: 'ad_gif' }],
                    [{ text: '🚀 Рассылка (фото)', callback_data: 'ad_photo' }],
                    [{ text: '🚀 Рассылка (кнопка)', callback_data: 'ad_btn' }]
                ]
            }
        });
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
}

module.exports = polling;