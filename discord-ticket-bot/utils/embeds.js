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
    .setTitle('⚡ TRX | التقديم والدعم')
    .setDescription(
      [
        'مرحبًا بك في نظام التذاكر الخاص بـ **TRX** 👋',
        '',
        'اختر القسم المناسب من الأزرار بالأسفل:',
        '',
        '🛠️ **دعم فني**',
        'للمشاكل والاستفسارات والمساعدة.',
        '',
        '🎮 **التقديم على التيم**',
        'للتقديم والانضمام إلى تيم TRX.',
        '',
        '🛡️ **التقديم على الإدارة**',
        'للتقديم على فريق إدارة TRX.',
        '',
        '━━━━━━━━━━━━━━━━━━',
        '📌 يرجى اختيار القسم المناسب وعدم فتح أكثر من تذكرة لنفس الطلب.',
      ].join('\n')
    )
    .setFooter({
      text: 'TRX • Support System',
    })
    .setTimestamp();
}

function ticketCreatedEmbed(user, type = 'support') {
  const avatar = user.displayAvatarURL({
    extension: 'png',
    size: 256,
  });

  const data = {
    support: {
      title: '🛠️ أهلاً بك في الدعم الفني',
      color: COLORS.primary,
      text: [
        `مرحبًا <@${user.id}> 👋`,
        '',
        'تم إنشاء تذكرة **الدعم الفني** بنجاح.',
        '',
        '📝 **اكتب مشكلتك أو استفسارك بالتفصيل.**',
        '📸 إذا كانت المشكلة تحتاج صورة أو إثبات، أرفقه هنا.',
        '',
        '🛡️ أحد أعضاء فريق الدعم سيقوم بمساعدتك.',
      ],
    },

    team: {
      title: '🎮 أهلاً بك في تقديم التيم',
      color: COLORS.success,
      text: [
        `مرحبًا <@${user.id}> 👋`,
        '',
        'تم إنشاء تذكرة **التقديم على التيم**.',
        '',
        '📋 **يرجى الإجابة على المعلومات التالية:**',
        '',
        '• اسمك:',
        '• عمرك:',
        '• خبرتك:',
        '• لماذا تريد الانضمام إلى TRX؟',
        '• أي معلومات إضافية:',
        '',
        '🏆 سيتم مراجعة طلبك من قبل المسؤولين.',
      ],
    },

    admin: {
      title: '🛡️ أهلاً بك في تقديم الإدارة',
      color: COLORS.warning,
      text: [
        `مرحبًا <@${user.id}> 👋`,
        '',
        'تم إنشاء تذكرة **التقديم على الإدارة**.',
        '',
        '📋 **يرجى الإجابة على المعلومات التالية:**',
        '',
        '• اسمك:',
        '• عمرك:',
        '• خبرتك في الإدارة:',
        '• لماذا تريد الانضمام إلى إدارة TRX؟',
        '• ما الذي يمكنك تقديمه للسيرفر؟',
        '• أي معلومات إضافية:',
        '',
        '👑 سيتم مراجعة طلبك من قبل الإدارة.',
      ],
    },
  };

  const selected = data[type] || data.support;

  return new EmbedBuilder()
    .setColor(selected.color)
    .setAuthor({
      name: user.username,
      iconURL: avatar,
    })
    .setTitle(selected.title)
    .setDescription(selected.text.join('\n'))
    .setThumbnail(avatar)
    .setFooter({
      text: 'TRX • Ticket System',
    })
    .setTimestamp();
}

function ticketClaimedEmbed(staffId) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('🎯 تم استلام التذكرة')
    .setDescription(
      `تم استلام هذه التذكرة بواسطة <@${staffId}>.\n\nسيتم متابعة طلبك الآن.`
    )
    .setTimestamp();
}

function closeRequestEmbed(userId) {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('🔒 إغلاق التذكرة')
    .setDescription(
      `هل أنت متأكد من رغبتك في إغلاق التذكرة <@${userId}>؟`
    );
}

function welcomeEmbed(member) {
  const avatar = member.user.displayAvatarURL({
    extension: 'png',
    size: 512,
  });

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({
      name: 'TRX Community',
      iconURL: avatar,
    })
    .setTitle('⚡ أهلاً بك في TRX')
    .setDescription(
      [
        `🎉 نورت السيرفر <@${member.id}>!`,
        '',
        `👤 **العضو:** ${member.user.username}`,
        '',
        '🏆 أهلاً بك في مجتمع **TRX**.',
        '🎮 نتمنى لك تجربة ممتعة معنا.',
        '',
        '📌 لا تنسَ قراءة القوانين والاطلاع على القنوات المهمة.',
        '',
        '🔥 **استمتع بوقتك معنا!**',
      ].join('\n')
    )
    .setThumbnail(avatar)
    .setFooter({
      text: `TRX • عضو جديد #${member.guild.memberCount}`,
    })
    .setTimestamp();
}

function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.danger)
    .setTitle('❌ حدث خطأ')
    .setDescription(message);
}

function successEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle('✅ تم بنجاح')
    .setDescription(message);
}

function ticketLogEmbed(ticket, extra = {}) {
  return new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle('📋 Ticket Log')
    .addFields(
      {
        name: '👤 صاحب التذكرة',
        value: ticket.creatorId
          ? `<@${ticket.creatorId}>`
          : 'غير معروف',
        inline: true,
      },
      {
        name: '🎫 النوع',
        value: ticket.typeName || 'غير معروف',
        inline: true,
      },
      {
        name: '🛡️ المستلم',
        value: ticket.claimerId
          ? `<@${ticket.claimerId}>`
          : 'لم يتم الاستلام',
        inline: true,
      },
      {
        name: '🔒 أغلق بواسطة',
        value: ticket.closedById
          ? `<@${ticket.closedById}>`
          : 'غير معروف',
        inline: true,
      }
    )
    .setTimestamp();
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