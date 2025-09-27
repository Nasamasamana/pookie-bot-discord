// commands/announceEdit.js
const createCmd = require('./announceCreate');

module.exports = {
  name: 'announceEdit',
  async execute({ message, client }) {
    try {
      // reuse create behavior to (re)open builder in current channel
      await createCmd.execute({ message, client });
      return message.reply('Reopened builder in this channel.');
    } catch (err) {
      console.error('announceEdit error', err);
      return message.reply('Failed to reopen builder.');
    }
  }
};
