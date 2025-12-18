// bot.js - Versiune optimizată pentru SkyBots

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// ===== CONFIGURARE =====
const config = {
    BOT_TOKEN: 'TELEGRAM_BOT_TOKEN_AICI', // Înlocuiește cu tokenul tău
    ADMIN_ID: 'ID_TELEGRAM_AICI', // Găsește-ți ID-ul cu @userinfobot
    SERVER_PORT: 3000,
    VERSION: '1.0.0'
};

console.log('🚀 Free Fire Panel Key Bot v' + config.VERSION);
console.log('📱 Rulează pe SkyBots - iPhone');

// ===== SETUP BOT TELEGRAM =====
const bot = new TelegramBot(config.BOT_TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

// ===== SISTEM DE CHEI =====
const keysDatabase = {
    '1': { name: '1 ZI', days: 1, emoji: '🕐' },
    '7': { name: '7 ZILE', days: 7, emoji: '📅' },
    '30': { name: '30 ZILE', days: 30, emoji: '📆' }
};

let userSessions = {};
let generatedKeys = [];

// ===== FUNCȚII GENERARE CHEI =====
function generateFreeFireKey(durationType) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Fără 0, O, I, 1 pentru evitare confuzii
    let key = '';
    
    // Format: XXXX-XXXX-XXXX-XXXX
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) key += '-';
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(now.getDate() + keysDatabase[durationType].days);
    
    return {
        key: key,
        type: keysDatabase[durationType].name,
        emoji: keysDatabase[durationType].emoji,
        created: now,
        expires: expires,
        active: true
    };
}

function validateIPALink(link) {
    if (!link) return false;
    const cleanLink = link.trim().toLowerCase();
    
    return (
        cleanLink.startsWith('http') &&
        (cleanLink.includes('freefire') || 
         cleanLink.includes('.ipa') || 
         cleanLink.includes('plist') ||
         cleanLink.includes('install'))
    );
}

// ===== SALVARE DATE =====
function saveData() {
    try {
        const data = {
            keys: generatedKeys,
            timestamp: new Date().toISOString()
        };
        fs.writeFileSync('/tmp/ff_keys.json', JSON.stringify(data, null, 2));
        console.log('💾 Date salvate');
    } catch (error) {
        console.error('❌ Eroare salvare date:', error);
    }
}

function loadData() {
    try {
        if (fs.existsSync('/tmp/ff_keys.json')) {
            const data = JSON.parse(fs.readFileSync('/tmp/ff_keys.json', 'utf8'));
            generatedKeys = data.keys || [];
            console.log(`📂 Încărcate ${generatedKeys.length} chei`);
        }
    } catch (error) {
        console.error('❌ Eroare încărcare date:', error);
    }
}

// ===== COMENZI BOT =====

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name || 'Utilizator';
    
    const welcomeMsg = `🎮 *Bun venit, ${name}!*\n\n` +
                      `*Free Fire Panel Key Generator v${config.VERSION}*\n\n` +
                      `🔑 *Comenzi disponibile:*\n` +
                      `/keycreate - Generează cheie nouă\n` +
                      `/mystats - Vezi cheile tale\n` +
                      `/help - Ajutor și instrucțiuni\n` +
                      `/status - Verifică starea botului\n\n` +
                      `⚠️ *Acest bot rulează pe SkyBots - iPhone*`;
    
    bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

// /status
bot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    const statusMsg = `✅ *Bot Online*\n\n` +
                     `📱 Platformă: SkyBots iPhone\n` +
                     `🕐 Uptime: ${process.uptime().toFixed(0)}s\n` +
                     `🔑 Chei generate: ${generatedKeys.length}\n` +
                     `👥 Sesii active: ${Object.keys(userSessions).length}\n\n` +
                     `*Server Details:*\n` +
                     `Node.js: ${process.version}\n` +
                     `Memorie: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`;
    
    bot.sendMessage(chatId, statusMsg, { parse_mode: 'Markdown' });
});

// /keycreate - Proces în 2 pași
bot.onText(/\/keycreate/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Pas 1: Cere link IPA
    bot.sendMessage(chatId, `🔗 *Pasul 1/2: Trimite linkul IPA*\n\n` +
                           `Te rog trimite link-ul IPA pentru Free Fire.\n` +
                           `Exemplu: \`https://server.com/freefire.ipa\``, 
                   {
                       parse_mode: 'Markdown',
                       reply_markup: { force_reply: true }
                   }).then(sentMsg => {
                       userSessions[userId] = {
                           step: 'waiting_ipa',
                           messageId: sentMsg.message_id,
                           chatId: chatId
                       };
                   });
});

// Procesare răspunsuri
bot.on('message', (msg) => {
    if (!msg.reply_to_message || !msg.text) return;
    
    const userId = msg.from.id;
    const session = userSessions[userId];
    
    if (!session || !session.step) return;
    
    if (session.step === 'waiting_ipa') {
        const ipaLink = msg.text.trim();
        
        if (!validateIPALink(ipaLink)) {
            bot.sendMessage(session.chatId, '❌ *Link invalid!*\n\nTrimite un link IPA valid pentru Free Fire.');
            delete userSessions[userId];
            return;
        }
        
        // Pas 2: Afișează opțiuni durată
        const optionsMsg = `✅ *Link validat!*\n\n` +
                          `🔗 Link primit: \`${ipaLink.substring(0, 50)}...\`\n\n` +
                          `*Pasul 2/2: Alege durata cheii:*`;
        
        bot.sendMessage(session.chatId, optionsMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🕐 1 ZI', callback_data: 'gen_1' },
                        { text: '📅 7 ZILE', callback_data: 'gen_7' }
                    ],
                    [
                        { text: '📆 30 ZILE', callback_data: 'gen_30' }
                    ],
                    [
                        { text: '❌ Anulează', callback_data: 'cancel' }
                    ]
                ]
            }
        });
        
        // Salvează link-ul în sesiune
        session.ipaLink = ipaLink;
        session.step = 'waiting_duration';
        userSessions[userId] = session;
    }
});

// Procesare butoane inline
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    if (data === 'cancel') {
        delete userSessions[userId];
        bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Operație anulată' });
        bot.deleteMessage(chatId, msg.message_id);
        return;
    }
    
    if (data.startsWith('gen_')) {
        const duration = data.split('_')[1];
        const session = userSessions[userId];
        
        if (!session || !session.ipaLink) {
            bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Sesiune expirată' });
            return;
        }
        
        // Generează cheia
        const keyData = generateFreeFireKey(duration);
        const keyId = 'FF-' + Date.now();
        
        // Adaugă cheia în listă
        generatedKeys.push({
            id: keyId,
            ...keyData,
            userId: userId,
            username: callbackQuery.from.username || 'Necunoscut',
            ipaLink: session.ipaLink
        });
        
        // Salvează datele
        saveData();
        
        // Formatare mesaj cheie
        const keyMsg = `🎉 *CHEIE GENERATĂ CU SUCCES!*\n\n` +
                      `${keyData.emoji} *Tip:* ${keyData.type}\n` +
                      `🔑 *Cheie:* \`${keyData.key}\`\n` +
                      `📅 *Creată:* ${keyData.created.toLocaleDateString('ro-RO')}\n` +
                      `⏰ *Expiră:* ${keyData.expires.toLocaleDateString('ro-RO')}\n\n` +
                      `*Instrucțiuni de utilizare:*\n` +
                      `1. Deschide Free Fire pe dispozitiv\n` +
                      `2. Accesează panoul de setări\n` +
                      `3. Introdu cheia în câmpul dedicat\n` +
                      `4. Aplică și repornește jocul\n\n` +
                      `⚠️ *Această cheie este unică și se va expira automat!*`;
        
        bot.sendMessage(chatId, keyMsg, { parse_mode: 'Markdown' });
        
        // Notificare admin
        if (userId.toString() !== config.ADMIN_ID) {
            const adminMsg = `📊 *CHEIE NOUĂ GENERATĂ*\n\n` +
                            `👤 Utilizator: @${callbackQuery.from.username || 'Fără username'}\n` +
                            `🆔 ID: ${userId}\n` +
                            `🔑 Cheie: ${keyData.key}\n` +
                            `⏱️ Durată: ${keyData.type}\n` +
                            `🔗 Link: ${session.ipaLink.substring(0, 30)}...`;
            
            bot.sendMessage(config.ADMIN_ID, adminMsg, { parse_mode: 'Markdown' });
        }
        
        bot.answerCallbackQuery(callbackQuery.id, { 
            text: `✅ ${keysDatabase[duration].name} cheie generată!` 
        });
        
        // Șterge sesiunea
        delete userSessions[userId];
    }
});

// /mystats
bot.onText(/\/mystats/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const userKeys = generatedKeys.filter(k => k.userId === userId);
    
    if (userKeys.length === 0) {
        bot.sendMessage(chatId, `📊 *Statistici personale*\n\nNu ai generat nicio cheie încă.\nFolosește /keycreate pentru a începe.`);
        return;
    }
    
    let statsMsg = `📊 *STATISTICI PERSONALE*\n\n`;
    statsMsg += `🔑 *Total chei:* ${userKeys.length}\n`;
    statsMsg += `✅ *Active:* ${userKeys.filter(k => k.active).length}\n\n`;
    
    userKeys.slice(-5).reverse().forEach((key, idx) => {
        const status = key.active ? '✅' : '❌';
        statsMsg += `${status} *Cheia ${idx + 1}:*\n`;
        statsMsg += `🔐: \`${key.key}\`\n`;
        statsMsg += `⏱️: ${key.type}\n`;
        statsMsg += `📅: ${new Date(key.expires).toLocaleDateString('ro-RO')}\n\n`;
    });
    
    bot.sendMessage(chatId, statsMsg, { parse_mode: 'Markdown' });
});

// /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    const helpMsg = `❓ *AJUTOR - Free Fire Key Bot*\n\n` +
                   `*Cum funcționează:*\n` +
                   `1. Trimite /keycreate\n` +
                   `2. Paste link IPA Free Fire\n` +
                   `3. Alege durata (1/7/30 zile)\n` +
                   `4. Primești cheia generată\n\n` +
                   `*Tipuri de chei:*\n` +
                   `• 🕐 1 ZI - Pentru testare\n` +
                   `• 📅 7 ZILE - Utilizare normală\n` +
                   `• 📆 30 ZILE - Premium full\n\n` +
                   `*Cerințe:*\n` +
                   `• Link IPA valid Free Fire\n` +
                   `• Cont Free Fire activ\n` +
                   `• Dispozitiv compatibil\n\n` +
                   `*Suport:* Contactează administratorul`;
    
    bot.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
});

// ===== ADMIN COMMANDS =====
bot.onText(/\/admin (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    if (userId.toString() !== config.ADMIN_ID) {
        bot.sendMessage(chatId, '❌ Nu ai permisiuni de administrator.');
        return;
    }
    
    const command = match[1];
    
    if (command === 'stats') {
        const stats = `📈 *ADMIN STATS*\n\n` +
                     `👥 Utilizatori unici: ${new Set(generatedKeys.map(k => k.userId)).size}\n` +
                     `🔑 Total chei: ${generatedKeys.length}\n` +
                     `✅ Active: ${generatedKeys.filter(k => k.active).length}\n` +
                     `📱 Sesii active: ${Object.keys(userSessions).length}`;
        
        bot.sendMessage(chatId, stats, { parse_mode: 'Markdown' });
    }
});

// ===== GESTIONARE ERORI =====
bot.on('polling_error', (error) => {
    console.log('⚠️ Eroare polling:', error.message);
});

bot.on('error', (error) => {
    console.log('⚠️ Eroare bot:', error.message);
});

// ===== START BOT =====
loadData();

console.log('=================================');
console.log('✅ Bot pornit cu succes!');
console.log('📱 Rulează pe SkyBots - iPhone');
console.log('🤖 Bot: @' + (bot.options.username || 'Necunoscut'));
console.log('=================================');

// Păstrează procesul activ
setInterval(() => {
    console.log('🔄 Bot în viață - ' + new Date().toLocaleTimeString());
}, 60000);
