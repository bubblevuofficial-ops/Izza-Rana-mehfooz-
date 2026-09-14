const fs = require('fs');
const path = require('path');

class CommandHandler {
  constructor() {
    this.commands = new Map();
  }

  // Load all command files from commands folder
  loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.loadCommands(filePath);
      } else if (file.endsWith('.js')) {
        const cmdModule = require(filePath);
        const cmds = Array.isArray(cmdModule) ? cmdModule : [cmdModule];

        for (const cmd of cmds) {
          if (cmd.name) {
            this.commands.set(cmd.name.toLowerCase(), cmd);
            if (cmd.alias && Array.isArray(cmd.alias)) {
              cmd.alias.forEach(a => this.commands.set(a.toLowerCase(), cmd));
            }
          }
        }
      }
    }
  }

  // Process incoming messages
  async run(sock, mek, db) {
    try {
      const from = mek.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = mek.key.fromMe
        ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
        : isGroup
        ? mek.key.participant
        : from;

      const body =
        mek.message?.conversation ||
        mek.message?.extendedTextMessage?.text ||
        mek.message?.imageMessage?.caption ||
        mek.message?.videoMessage?.caption ||
        '';

      if (!body.startsWith(db.prefix)) return;

      const args = body.slice(db.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      const q = args.join(' ');

      const cmd = this.commands.get(commandName);
      if (!cmd) return;

      // Clean phone numbers for owner validation
      const senderNum = sender.split('@')[0].replace(/[^0-9]/g, '');
      const ownerNum = String(db.ownerNumber).replace(/[^0-9]/g, '');
      const isOwner = mek.key.fromMe || senderNum === ownerNum;

      // Group & Owner Security Guards
      if (cmd.ownerOnly && !isOwner) {
        return await sock.sendMessage(from, { text: '❌ This command is restricted to the bot owner only.' }, { quoted: mek });
      }

      if (cmd.groupOnly && !isGroup) {
        return await sock.sendMessage(from, { text: '❌ This command can only be used in group chats.' }, { quoted: mek });
      }

      const reply = async (text, options = {}) => {
        return await sock.sendMessage(from, { text, ...options }, { quoted: mek });
      };

      // Execute Command
      await cmd.execute({ sock, m: mek, reply, args, q, db, isOwner, isGroup, sender });
    } catch (err) {
      console.error('Error in CommandHandler:', err);
    }
  }
}

module.exports = CommandHandler;
