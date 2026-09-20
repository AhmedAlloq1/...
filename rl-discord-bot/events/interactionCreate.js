const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const config = require('../config/config');
const { findOpenTicket, createTicket, isStaff } = require('../utils/tickets');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction);
        return;
      }

      if (interaction.isButton()) {
        const { customId } = interaction;

        if (customId === 'ticket_create') return handleTicketCreate(interaction);
        if (customId === 'ticket_claim') return handleTicketClaim(interaction);
        if (customId === 'ticket_close') return handleTicketCloseAsk(interaction);
        if (customId === 'ticket_close_confirm') return handleTicketCloseConfirm(interaction);
        if (customId === 'ticket_close_cancel') {
          return interaction.update({ content: '❌ تم إلغاء إغلاق التذكرة.', components: [] });
        }
      }
    } catch (err) {
      console.error('[INTERACTION ERROR]', err);
      const payload = { content: '❌ حدث خطأ غير متوقع أثناء تنفيذ هذا الإجراء.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  },
};

async function handleTicketCreate(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;

  const existing = findOpenTicket(guild, member.id);
  if (existing) {
    return interaction.reply({
      content: `❌ لديك Ticket مفتوحة بالفعل: <#${existing.id}>`,
      ephemeral: true,
    });
  }

  const me = guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({
      content: '❌ لا يملك البوت صلاحية Manage Channels لإنشاء تذكرة.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    const channel = await createTicket(guild, member);
    console.log(`[TICKET] Created for ${member.user.tag}: #${channel.name}`);
    await interaction.editReply({ content: `✅ تم إنشاء التذكرة: <#${channel.id}>` });
  } catch (err) {
    console.error('[TICKET CREATE ERROR]', err);
    await interaction.editReply({ content: `❌ فشل إنشاء التذكرة: ${err.message}` });
  }
}

async function handleTicketClaim(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية لاستخدام Claim.', ephemeral: true });
  }

  const message = interaction.message;
  const oldEmbed = message.embeds[0];
  const embed = EmbedBuilder.from(oldEmbed);
  const fields = oldEmbed.fields.map((f) =>
    f.name === 'الحالة' ? { ...f, value: `🟡 تم الاستلام بواسطة <@${interaction.user.id}>` } : f
  );
  embed.setFields(fields);

  await interaction.update({ embeds: [embed] });
  await interaction.followUp({ content: `🙋 تم استلام التذكرة بواسطة <@${interaction.user.id}>` });
  console.log(`[TICKET] Claimed by ${interaction.user.tag} in #${interaction.channel.name}`);
}

async function handleTicketCloseAsk(interaction) {
  const isOwner = interaction.channel.topic === `ticket-owner:${interaction.user.id}`;
  const allowed = isStaff(interaction.member) || (!config.ticketCloseStaffOnly && isOwner);

  if (!allowed) {
    return interaction.reply({ content: '❌ ليس لديك صلاحية لإغلاق هذه التذكرة.', ephemeral: true });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close_confirm')
      .setLabel('Close Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Cancel').setEmoji('❌').setStyle(ButtonStyle.Secondary)
  );

  await interaction.reply({ content: 'هل أنت متأكد من إغلاق التذكرة؟', components: [row], ephemeral: true });
}

async function handleTicketCloseConfirm(interaction) {
  const channel = interaction.channel;
  try {
    await interaction.update({ content: '🔒 جاري إغلاق التذكرة...', components: [] });
    console.log(`[TICKET] Closed by ${interaction.user.tag} in #${channel.name}`);
    setTimeout(() => {
      channel.delete('Ticket closed').catch((err) => console.error('[TICKET DELETE ERROR]', err));
    }, 3000);
  } catch (err) {
    console.error('[TICKET CLOSE ERROR]', err);
  }
}
