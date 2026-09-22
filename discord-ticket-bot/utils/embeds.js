// utils/embeds.js
const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0x5865f2,
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c,
  neutral: 0x2b2d31,
};

function ticketPanelEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('⚡ TRX | التقديم')
    .setDescription(
      [
        '> 🎮 **تقدر الآن تتقدم للانضمام إلى كلان TRX!**',
        '> أثبت مهاراتك وكن جزءًا من فريقنا. 🏆',
        '',
        '> 🛡️ **كما يمكنك التقديم على إدارة كلان TRX!**',
        '> إذا كنت نشيطًا، متعاونًا، وتملك خبرة في الإدارة، فنحن نرحب بك.',
        '',
        '> 🛠️ **دعم فني TRX!**',
        '> لو عندك أي مشكلة أو تحتاج مساعدة، تقدر تتواصل مع فريق الدعم الفني وسيتم مساعدتك بأسرع وقت ممكن.',
        '',
        '**📩 اختر نوع التقديم المناسب لك وابدأ طلبك الآن!**',
      ].join('\n')
    )
    .setFooter({
      text: 'TRX • اختر نوع التقديم من الزر بالأسفل',
    });
}

function ticketCreatedEmbed(user) {
  const avatar = user.displayAvatarURL({
    dynamic: true,
    size: 256,
  });

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🎫 أهلاً بك في دعم TRX')
    .setDescription(
      [
        `مرحبًا <@${user.id}> 👋`,
        '',
        'تم إنشاء تذكرتك بنجاح.',
        '',
        '📝 **اكتب طلبك أو مشكلتك بالتفصيل هنا.**',
        '🛡️ سيقوم أحد أعضاء فريق **TRX** بمساعدتك في أقرب وقت ممكن.',
        '',
        '⚠️ يرجى عدم فتح أكثر من تذكرة لنفس المشكلة.',
      ].join('\n')
    )
    .setThumbnail(avatar)
    .setFooter({
      text: 'TRX Support • نتمنى لك تجربة موفقة',
    })
    .setTimestamp();
}

function ticketClaimedEmbed(staffId) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('🎯 تم استلام التذكرة')
    .setDescription(`تم استلام هذه التذكرة بواسطة <@${staffId}>.`);
}

function closeRequestEmbed(userId) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🔒 طلب إغلاق التذكرة')
    .setDescription(
      `<@${userId}>\n\nتم طلب إغلاق هذه التذكرة من أحد أعضاء الفريق.\nهل تريد إغلاق التذكرة؟`
    );
}

function welcomeEmbed(userId) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('👋 Welcome!')
    .setDescription(
      `Welcome <@${userId}>!\n\nWelcome to the server!\nEnjoy your stay and make yourself at home. ❤️`
    );
}

function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setDescription(`❌ ${message}`);
}

function successEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setDescription(`✅ ${message}`);
}

function ticketLogEmbed(ticket, extra = {}) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle('📁 Ticket Log')
    .addFields(
      {
        name: 'Ticket',
        value: extra.channelName || ticket.channelId,
        inline: true,
      },
      {
        name: 'Creator',
        value: `<@${ticket.creatorId}>`,
        inline: true,
      },
      {
        name: 'Claimed By',
        value: ticket.claimerId
          ? `<@${ticket.claimerId}>`
          : 'Not claimed',
        inline: true,
      },
      {
        name: 'Closed By',
        value: ticket.closedById
          ? `<@${ticket.closedById}>`
          : 'Unknown',
        inline: true,
      },
      {
        name: 'Created At',
        value: ticket.createdAt
          ? `<t:${Math.floor(new Date(ticket.createdAt).getTime() / 1000)}:F>`
          : 'Unknown',
        inline: true,
      },
      {
        name: 'Closed At',
        value: ticket.closedAt
          ? `<t:${Math.floor(new Date(ticket.closedAt).getTime() / 1000)}:F>`
          : 'Unknown',
        inline: true,
      }
    )
    .setTimestamp();

  return embed;
}

module.exports = {
  COLORS,
  ticketPanelEmbed,
  ticketCreatedEmbed,
  ticketClaimedEmbed,
  closeRequestEmbed,
  welcomeEmbed,
  errorEmbed,
  successEmbed,
  ticketLogEmbed,
};