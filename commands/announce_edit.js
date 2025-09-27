// commands/announce_edit.js
const createCmd = require('./announce_create');

module.exports = {
  name: 'announce_edit',
  async execute({ message, client }) {
    // reuse the create command behavior to (re)open the builder in the current channel
    await createCmd.execute({ message, client });
    return message.reply('Reopened builder in this channel.');
  }
};
