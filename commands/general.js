module.exports = [
  {
    name: 'ping',
    alias: ['p', 'speed'],
    desc: 'Check bot response speed',
    execute: async ({ reply }) => {
      const start = Date.now();
      await reply('Testing speed...');
      const end = Date.now();
      await reply(`Pong! Response Time: ${end - start}ms`);
    }
  },
  {
    name: 'alive',
    alias: ['bot', 'info'],
    desc: 'Check bot system status',
    execute: async ({ reply, db }) => {
      const statusText = `*${db.botName} Status*\n\n` +
        `• Status: Online\n` +
        `• Owner: ${db.ownerName}\n` +
        `• Prefix: ${db.prefix}\n` +
        `• Mode: ${db.mode}`;
      
      await reply(statusText);
    }
  }
];
