// utils/ticketLogger.js
// بيبعت لوج الإغلاق + ملف Transcript بصيغة HTML (شكل ديسكورد) في روم لوج التذاكر.
// مبيعملش throw أبداً — فشل اللوج مايوقفش إغلاق التذكرة.

const { EmbedBuilder } = require('discord.js');
const config = require('./config');
const { getLogChannel } = require('./logger');
const { ticketLogEmbed } = require('./embeds');
const { buildTranscriptHtml } = require('./transcript');

const MAX_MESSAGES = 1000; // أقصى عدد رسايل بتتحفظ في الـ Transcript
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // أقصى حجم للصورة الواحدة اللي بتتدمج جوه الملف
const MAX_TOTAL_IMAGE_BYTES = 6 * 1024 * 1024; // أقصى حجم لكل الصور مع بعض
const MAX_FILE_BYTES = 9 * 1024 * 1024; // أقل من حد رفع الملفات في ديسكورد

function resolveLogChannel(guild) {
  // /setup-logs (tickets) الأول، وبعدين TICKET_LOG_CHANNEL_ID كاحتياطي
  return (
    getLogChannel(guild, 'tickets') ||
    (config.ticketLogChannelId ? guild.channels.cache.get(config.ticketLogChannelId) : null)
  );
}

const toHex = (n) => (n ? `#${n.toString(16).padStart(6, '0')}` : null);

// ---------------------------------------------------------
// تحميل الرسايل (بالصفحات، أقدم -> أحدث)
// ---------------------------------------------------------
async function fetchAllMessages(channel) {
  const all = [];
  let before;
  while (all.length < MAX_MESSAGES) {
    const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (batch.size === 0) break;
    all.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  return all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

// ---------------------------------------------------------
// دمج الصور جوه الملف (عشان تفضل شغالة بعد حذف القناة)
// ---------------------------------------------------------
function makeInliner() {
  let total = 0;
  const cache = new Map();

  return async function inline(url, type = 'image/png') {
    if (!url) return url;
    if (cache.has(url)) return cache.get(url);

    let result = url;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length <= MAX_IMAGE_BYTES && total + buf.length <= MAX_TOTAL_IMAGE_BYTES) {
          const mime = (res.headers.get('content-type') || type).split(';')[0];
          if (/^image\/(png|jpe?g|gif|webp)$/i.test(mime)) {
            total += buf.length;
            result = `data:${mime};base64,${buf.toString('base64')}`;
          }
        }
      }
    } catch {
      // لو فشل التحميل بنسيب اللينك الأصلي
    }
    cache.set(url, result);
    return result;
  };
}

// ---------------------------------------------------------
// تحويل رسالة ديسكورد -> الشكل اللي transcript.js بيفهمه
// ---------------------------------------------------------
async function convertMessage(m, byId, inline) {
  const authorAvatar = await inline(m.author.displayAvatarURL({ extension: 'png', size: 64 }));

  let reply = null;
  if (m.reference?.messageId) {
    const ref = byId.get(m.reference.messageId);
    if (ref) {
      reply = {
        name: ref.member?.displayName || ref.author.username,
        snippet: (ref.content || (ref.embeds.length ? '[embed]' : '[مرفق]')).slice(0, 80),
        avatar: null,
      };
    }
  }

  const attachments = [];
  for (const a of m.attachments.values()) {
    const isImage = /^image\/(png|jpe?g|gif|webp)$/i.test(a.contentType || '');
    attachments.push({
      name: a.name,
      url: a.url,
      type: a.contentType || '',
      size: a.size,
      src: isImage ? await inline(a.url, a.contentType) : undefined,
    });
  }

  const embeds = [];
  for (const e of m.embeds) {
    embeds.push({
      color: toHex(e.color),
      authorName: e.author?.name,
      authorIcon: e.author?.iconURL ? await inline(e.author.iconURL) : null,
      title: e.title,
      url: e.url,
      description: e.description,
      fields: (e.fields || []).map((f) => ({ name: f.name, value: f.value, inline: f.inline })),
      thumbnail: e.thumbnail?.url ? await inline(e.thumbnail.url) : null,
      image: e.image?.url ? await inline(e.image.url) : null,
      footer: e.footer?.text,
      footerIcon: null,
      timestamp: e.timestamp,
    });
  }

  const buttons = [];
  for (const row of m.components || []) {
    for (const c of row.components || []) {
      if (c.label || c.emoji) {
        buttons.push({ label: c.label, emoji: c.emoji?.name, style: c.style });
      }
    }
  }

  return {
    id: m.id,
    ts: m.createdTimestamp,
    authorId: m.author.id,
    authorName: m.member?.displayName || m.author.username,
    authorAvatar,
    authorColor: m.member?.displayHexColor && m.member.displayHexColor !== '#000000' ? m.member.displayHexColor : null,
    bot: m.author.bot,
    content: m.content,
    edited: !!m.editedTimestamp,
    reply,
    attachments,
    embeds,
    buttons,
    stickers: [...m.stickers.values()].map((s) => s.name),
  };
}

// أسماء المنشنات (يوزر / رول / روم) عشان تظهر صح في الملف
function buildContext(guild, messages) {
  const text = messages
    .map((m) => [m.content, ...m.embeds.map((e) => `${e.description || ''} ${(e.fields || []).map((f) => f.value).join(' ')}`)].join(' '))
    .join(' ');

  const users = {};
  for (const m of messages) users[m.author.id] = m.member?.displayName || m.author.username;
  for (const [, id] of text.matchAll(/<@!?(\d+)>/g)) {
    if (users[id]) continue;
    const member = guild.members.cache.get(id);
    users[id] = member?.displayName || guild.client.users.cache.get(id)?.username || 'unknown-user';
  }

  const roles = {};
  for (const [, id] of text.matchAll(/<@&(\d+)>/g)) {
    const r = guild.roles.cache.get(id);
    if (r) roles[id] = { name: r.name, color: r.color ? toHex(r.color) : null };
  }

  const channels = {};
  for (const [, id] of text.matchAll(/<#(\d+)>/g)) {
    const c = guild.channels.cache.get(id);
    if (c) channels[id] = c.name;
  }

  return { users, roles, channels };
}

// ---------------------------------------------------------
// بناء ملف الـ Transcript
// ---------------------------------------------------------
async function buildTranscript(guild, channel, ticket) {
  const raw = await fetchAllMessages(channel);
  if (raw.length === 0) return null;

  const byId = new Map(raw.map((m) => [m.id, m]));
  const inline = makeInliner();

  const messages = [];
  for (const m of raw) messages.push(await convertMessage(m, byId, inline));

  const fmt = (v) => (v ? new Date(v).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : null);

  const html = buildTranscriptHtml({
    guildName: guild.name,
    guildIcon: guild.iconURL({ extension: 'png', size: 128 }),
    channelName: channel.name,
    info: [
      { label: 'النوع', value: ticket.typeName },
      { label: 'صاحب التذكرة', value: ticket.creatorTag || ticket.creatorId },
      { label: 'المستلم', value: ticket.claimerTag || ticket.claimerId || 'لم يتم الاستلام' },
      { label: 'أغلق بواسطة', value: ticket.closedByTag || ticket.closedById },
      { label: 'فُتحت', value: fmt(ticket.createdAt) },
      { label: 'أُغلقت', value: fmt(ticket.closedAt) },
    ],
    messages,
    ctx: buildContext(guild, raw),
  });

  return Buffer.from(html, 'utf8');
}

// ---------------------------------------------------------
// الدالة الرئيسية (نفس الاسم والتوقيع القديم)
// ---------------------------------------------------------
async function logTicketClose(guild, channel, ticket) {
  const logChannel = resolveLogChannel(guild);

  if (!logChannel) {
    console.warn('[TICKET LOG] No ticket log channel found (check /setup-logs or TICKET_LOG_CHANNEL_ID).');
    return;
  }

  try {
    await logChannel.send({ embeds: [ticketLogEmbed(ticket, { channelName: channel.name })] });

    try {
      const buffer = await buildTranscript(guild, channel, ticket);
      if (buffer) {
        if (buffer.length > MAX_FILE_BYTES) {
          console.warn('[TICKET LOG] Transcript too large to upload:', buffer.length);
        } else {
          await logChannel.send({
            content: `📄 Transcript — **${channel.name}**\nحمّل الملف وافتحه في المتصفح.`,
            files: [{ attachment: buffer, name: `${channel.name}-transcript.html` }],
          });
        }
      }
    } catch (transcriptErr) {
      console.warn('[TICKET LOG] Could not build transcript:', transcriptErr.message);
    }
  } catch (err) {
    console.error('[TICKET LOG] Failed to send log message:', err);
  }
}

// ---------------------------------------------------------
// لوج فتح تذكرة
// ---------------------------------------------------------
async function logTicketOpen(guild, channel, ticket) {
  const logChannel = resolveLogChannel(guild);
  if (!logChannel) {
    console.warn('[TICKET LOG] No ticket log channel found (check /setup-logs or TICKET_LOG_CHANNEL_ID).');
    return;
  }

  try {
    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('🟢 تذكرة جديدة')
          .addFields(
            { name: '👤 صاحب التذكرة', value: ticket.creatorId ? `<@${ticket.creatorId}>` : 'غير معروف', inline: true },
            { name: '🎫 النوع', value: ticket.typeName || 'غير معروف', inline: true },
            { name: '📍 القناة', value: `<#${channel.id}>`, inline: true }
          )
          .setTimestamp(),
      ],
    });
  } catch (err) {
    console.error('[TICKET LOG] Failed to send open log:', err);
  }
}

module.exports = { logTicketClose, logTicketOpen };
