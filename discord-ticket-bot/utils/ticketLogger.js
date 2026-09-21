// utils/ticketLogger.js
const config = require('./config');
const { ticketLogEmbed } = require('./embeds');

/**
 * Sends a log embed (and best-effort text transcript) to the configured
 * ticket log channel. Never throws — logging failures should not affect
 * the ticket-closing flow itself.
 */
async function logTicketClose(guild, channel, ticket) {
  if (!config.ticketLogChannelId) return;

  const logChannel = guild.channels.cache.get(config.ticketLogChannelId);
  if (!logChannel) {
    console.warn('[TICKET LOG] Configured log channel was not found.');
    return;
  }

  try {
    await logChannel.send({ embeds: [ticketLogEmbed(ticket, { channelName: channel.name })] });

    // Best-effort plain-text transcript of the last messages in the channel.
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
      if (sorted.length > 0) {
        const lines = sorted.map((m) => {
          const author = m.author?.tag || 'Unknown';
          const content = m.content || (m.embeds.length ? '[embed]' : '[no content]');
          return `[${m.createdAt.toISOString()}] ${author}: ${content}`;
        });
        const transcript = lines.join('\n').slice(0, 1_900_000); // stay well under Discord's file limits
        const buffer = Buffer.from(transcript, 'utf8');
        await logChannel.send({
          content: `📄 Transcript for **${channel.name}**`,
          files: [{ attachment: buffer, name: `${channel.name}-transcript.txt` }],
        });
      }
    } catch (transcriptErr) {
      console.warn('[TICKET LOG] Could not build transcript:', transcriptErr.message);
    }
  } catch (err) {
    console.error('[TICKET LOG] Failed to send log message:', err);
  }
}

module.exports = { logTicketClose };
