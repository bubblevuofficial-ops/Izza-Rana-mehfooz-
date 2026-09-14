const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const path = require('path');
const config = require('./config');
const CommandHandler = require('./handler');

// 1. Bot Database & Global Configuration Setup
let db = {
  mode: config.mode || 'public',
  prefix: config.prefix || '.',
  botName: config.botName || 'WhatsApp Bot',
  ownerName: 'Mahfooz Ahmad',
  ownerNumber: '923327051601',
  features: { ...config.features }
};

// 2. Load Command Handler
const cmdHandler = new CommandHandler();
cmdHandler.loadCommands(path.join(__dirname, 'commands'));

// 3. Main Engine Function
async function startBot() {
  // Load or create session authentication state
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false
  });

  // Handle connection events and QR Pairing
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // Display QR Code in terminal if generated
    if (qr) {
      console.log('Scan the QR code below to pair with number: 923327051601');
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('Connection closed. Reconnecting...');
        startBot();
      } else {
        console.log('Session logged out. Delete auth_info folder and scan QR again.');
      }
    } else if (connection === 'open') {
      console.log(`[SUCCESS] ${db.botName} is connected successfully!`);
      console.log(`[INFO] Owner Name: ${db.ownerName}`);
      console.log(`[INFO] Owner Number: ${db.ownerNumber}`);
    }
  });

  // Save auth state changes
  sock.ev.on('creds.update', saveCreds);

  // Incoming Messages Listener
  sock.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages[0];
      if (!mek || !mek.message) return;
      if (mek.key && mek.key.remoteJid === 'status@broadcast') return;

      // Execute message handler
      await cmdHandler.run(sock, mek, db);
    } catch (err) {
      console.error('Error handling incoming message:', err);
    }
  });
}

// Start the WhatsApp Bot
startBot();
