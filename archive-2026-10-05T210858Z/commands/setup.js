
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');

const TICKET_CATEGORY_ID = '1554425317588992002';

// الرولات التي سيحتاجها تنظيم السيرفر
const ROLE_DEFINITIONS = [
  { name: 'Owner', color: 0xE74C3C },
  { name: 'الإدارة العليا', color: 0x9B59B6 },
  { name: 'Admin', color: 0xE67E22 },
  { name: 'Moderator', color: 0x3498DB },
  { name: 'Editor', color: 0x2ECC71 },
  { name: 'Member', color: 0x95A5A6 },
];

const STAFF_ROLES = [
  'Owner',
  'الإدارة العليا',
  'Admin',
  'Moderator',
];

const CHANNEL_STRUCTURE = [
  {
    category: '📌・معلومات السيرفر',
    channels: [
      { name: '📜・القوانين', type: 'text', staffOnly: false },
      { name: '📢・الإعلانات', type: 'text', staffOnly: false },
      { name: '👋・الترحيب', type: 'text', staffOnly: false },
      { name: '🎭・اختيار-الرولات', type: 'text', staffOnly: false },
    ],
  },
  {
    category: '💬・المجتمع',
    channels: [
      { name: '💬・الشات-العام', type: 'text', staffOnly: false },
      { name: '🤖・أوامر-البوت', type: 'text', staffOnly: false },
      { name: '📸・ميديا', type: 'text', staffOnly: false },
      { name: '🔊・General', type: 'voice', staffOnly: false },
      { name: '🎮・Gaming', type: 'voice', staffOnly: false },
    ],
  },
  {
    category: '🛡️・الإدارة',
    channels: [
      { name: '💬・شات-الإدارة', type: 'text', staffOnly: true },
      { name: '📋・تقارير-الإدارة', type: 'text', staffOnly: true },
      { name: '🔊・اجتماع-الإدارة', type: 'voice', staffOnly: true },
    ],
  },
  {
    category: '📂・السجلات',
    channels: [
      { name: '📜・سجل-الرسائل', type: 'text', staffOnly: true },
      { name: '🚪・سجل-الدخول', type: 'text', staffOnly: true },
      { name: '🔨・سجل-العقوبات', type: 'text', staffOnly: true },
      { name: '⚙️・سجل-السيرفر', type: 'text', staffOnly: true },
    ],
  },
];

function findRole(guild, name) {
  return guild.roles.cache.find((role) => role.name === name);
}

async function ensureRole(guild, definition) {
  const existing = findRole(guild, definition.name);

  if (existing) return existing;

  return guild.roles.create({
    name: definition.name,
    color: definition.color,
    reason: 'إعداد السيرفر باستخدام /setup',
  });
}

async function ensureCategory(guild, name, overwrites = []) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name === name
  );

  if (existing) return existing;

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: overwrites,
    reason: 'إعداد السيرفر باستخدام /setup',
  });
}

async function ensureChannel(guild, category, definition, overwrites) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.name === definition.name &&
      channel.parentId === category.id &&
      (
        definition.type === 'text'
          ? channel.type === ChannelType.GuildText
          : channel.type === ChannelType.GuildVoice
      )
  );

  if (existing) return existing;

  return guild.channels.create({
    name: definition.name,
    type:
      definition.type === 'voice'
        ? ChannelType.GuildVoice
        : ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: overwrites,
    reason: 'إعداد السيرفر باستخدام /setup',
  });
}

function makeOverwrites(guild, staffRoles, staffOnly) {
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: staffOnly
        ? [PermissionFlagsBits.ViewChannel]
        : [],
      allow: staffOnly
        ? []
        : [PermissionFlagsBits.ViewChannel],
    },
  ];

  if (staffOnly) {
    for (const role of staffRoles) {
      overwrites.push({
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
        ],
      });
    }
  }

  return overwrites;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('إعداد رومات ورولات السيرفر تلقائيًا')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.inGuild()) {
      return interaction.reply({
        content: '❌ هذا الأمر يعمل داخل السيرفر فقط.',
        ephemeral: true,
      });
    }

    if (!interaction.memberPermissions?.has(
      PermissionFlagsBits.Administrator
    )) {
      return interaction.reply({
        content: '❌ تحتاج إلى صلاحية Administrator لاستخدام الأمر.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;

    try {
      const created = {
        roles: 0,
        categories: 0,
        channels: 0,
      };

      // 1. إنشاء الرولات المطلوبة أو استخدام الموجود منها
      for (const definition of ROLE_DEFINITIONS) {
        const existed = findRole(guild, definition.name);
        await ensureRole(guild, definition);

        if (!existed) created.roles++;
      }

      await guild.roles.fetch();

      const staffRoles = STAFF_ROLES
        .map((name) => findRole(guild, name))
        .filter(Boolean);

      // 2. إنشاء أقسام السيرفر وروماتها
      for (const section of CHANNEL_STRUCTURE) {
        const oldCategory = guild.channels.cache.find(
          (channel) =>
            channel.type === ChannelType.GuildCategory &&
            channel.name === section.category
        );

        const categoryOverwrites = makeOverwrites(
          guild,
          staffRoles,
          section.category === '🛡️・الإدارة' ||
          section.category === '📂・السجلات'
        );

        const category = await ensureCategory(
          guild,
          section.category,
          categoryOverwrites
        );

        if (!oldCategory) created.categories++;

        for (const definition of section.channels) {
          const oldChannel = guild.channels.cache.find(
            (channel) =>
              channel.name === definition.name &&
              channel.parentId === category.id &&
              (
                definition.type === 'text'
                  ? channel.type === ChannelType.GuildText
                  : channel.type === ChannelType.GuildVoice
              )
          );

          const overwrites = makeOverwrites(
            guild,
            staffRoles,
            definition.staffOnly
          );

          await ensureChannel(
            guild,
            category,
            definition,
            overwrites
          );

          if (!oldChannel) created.channels++;
        }
      }

      // 3. التحقق من كاتيجوري التذاكر الحالية
      const ticketCategory = guild.channels.cache.get(
        TICKET_CATEGORY_ID
      );

      let ticketMessage;

      if (
        ticketCategory &&
        ticketCategory.type === ChannelType.GuildCategory
      ) {
        ticketMessage =
          `✅ تم العثور على كاتيجوري التذاكر الحالية: ${ticketCategory.name}`;
      } else {
        ticketMessage =
          '⚠️ لم يتم العثور على كاتيجوري التذاكر المحددة. لم يتم تغيير إعداداتها. راجع TICKET_CATEGORY_ID في الملف.';
      }

      await interaction.editReply({
        content:
          '✅ **تم إعداد السيرفر بنجاح!**\n\n' +
          `👥 رولات جديدة: **${created.roles}**\n` +
          `📁 كاتيجوريز جديدة: **${created.categories}**\n` +
          `💬 رومات جديدة: **${created.channels}**\n\n` +
          ticketMessage +
          '\n\nلم يتم حذف أي رومات أو رولات موجودة.',
      });
    } catch (error) {
      console.error('[SETUP COMMAND ERROR]', error);

      await interaction.editReply({
        content:
          '❌ حصل خطأ أثناء إعداد السيرفر. تأكد أن البوت لديه صلاحيات Manage Channels وManage Roles، وأن رتبة البوت أعلى من الرولات التي ينشئها أو يديرها.',
      });
    }
  },
};
