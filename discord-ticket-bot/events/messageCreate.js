// events/messageCreate.js
const { Events } = require('discord.js');
const { getReply } = require('../utils/chatResponder');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    try {
      if (message.author.bot) return; // Never respond to bots, including itself.

      const client = message.client;
      const isMention = message.mentions.has(client.user, { ignoreEveryone: true, ignoreRoles: true });

      let isReplyToBot = false;
      if (message.reference?.messageId) {
        try {
          const referenced = await message.channel.messages.fetch(message.reference.messageId);
          isReplyToBot = referenced.author.id === client.user.id;
        } catch {
          isReplyToBot = false; // Referenced message couldn't be fetched — ignore rather than crash.
        }
      }

      if (!isMention && !isReplyToBot) return;

      // Strip the mention text so the AI/fallback sees just the user's words.
      const cleanContent = message.content.replace(/<@!?\d+>/g, '').trim();
      const contentForReply = cleanContent.length > 0 ? cleanContent : 'hello';

      await message.channel.sendTyping().catch(() => {});
      const reply = await getReply(contentForReply);
      await message.reply({ content: reply, allowedMentions: { repliedUser: true } });
    } catch (err) {
      console.error('[CHAT] Failed to handle message:', err);
      // Swallow the error — a chat failure should never crash the bot.
    }
  },
};
