// utils/transcript.js
// بيبني ملف HTML شكله زي ديسكورد (دارك مود): صورة كل شخص + اسمه + الوقت + الإمبدات والصور.
// مفيش أي مكتبات خارجية — بياخد رسايل عادية (objects) ويرجّع نص HTML.

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// بنقبل بس لينكات https/http أو صور data: — أي حاجة تانية بتتشال
function safeUrl(u) {
  if (!u) return '';
  const s = String(u);
  if (/^https?:\/\//i.test(s) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(s)) return esc(s);
  return '';
}

const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '');

// =====================================================
// Markdown (نفس ماركداون ديسكورد تقريباً)
// =====================================================

function renderMarkdown(text, ctx = {}) {
  if (!text) return '';

  const stash = [];
  const hold = (html) => {
    stash.push(html);
    return `\u0000${stash.length - 1}\u0000`;
  };

  let out = String(text);

  // 1) الكود الأول عشان مفيش تنسيق يتطبق جواه
  out = out.replace(/```(?:[a-zA-Z0-9_+-]*\n)?([\s\S]*?)```/g, (_, code) =>
    hold(`<pre dir="auto">${esc(code.replace(/^\n+|\n+$/g, ''))}</pre>`)
  );
  out = out.replace(/`([^`\n]+?)`/g, (_, code) => hold(`<code class="inline">${esc(code)}</code>`));

  // 2) escape لباقي النص
  out = esc(out);

  // 3) المنشنات والإيموجي
  out = out.replace(/&lt;@!?(\d+)&gt;/g, (_, id) =>
    hold(`<span class="mention">@${esc(ctx.users?.[id] || 'unknown-user')}</span>`)
  );
  out = out.replace(/&lt;@&amp;(\d+)&gt;/g, (_, id) => {
    const r = ctx.roles?.[id];
    const style = isHex(r?.color) ? ` style="color:${r.color};background:${r.color}26"` : '';
    return hold(`<span class="mention"${style}>@${esc(r?.name || 'role')}</span>`);
  });
  out = out.replace(/&lt;#(\d+)&gt;/g, (_, id) =>
    hold(`<span class="mention">#${esc(ctx.channels?.[id] || 'channel')}</span>`)
  );
  out = out.replace(/&lt;(a?):(\w+):(\d+)&gt;/g, (_, animated, name, id) =>
    hold(
      `<img class="emoji" alt=":${esc(name)}:" title=":${esc(name)}:" ` +
        `src="https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'webp'}?size=48">`
    )
  );
  out = out.replace(/@(everyone|here)\b/g, (m) => hold(`<span class="mention">${m}</span>`));

  // 4) اللينكات
  out = out.replace(/https?:\/\/(?:[^\s&\u0000]|&amp;)+/g, (url) => {
    const trail = url.match(/[.,;:!?)\]}]+$/)?.[0] || '';
    const clean = trail ? url.slice(0, -trail.length) : url;
    return hold(`<a href="${clean}" target="_blank" rel="noopener noreferrer">${clean}</a>`) + trail;
  });

  // 5) التنسيق
  out = out
    .replace(/\|\|([\s\S]+?)\|\|/g, '<span class="spoiler">$1</span>')
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([\s\S]+?)__/g, '<u>$1</u>')
    .replace(/\*(?!\s)([^*\n]+?)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_(?!\s)([^_\n]+?)_(?![\w])/g, '$1<em>$2</em>')
    .replace(/~~([\s\S]+?)~~/g, '<s>$1</s>');

  // 6) كل سطر لوحده (dir=auto عشان العربي واللإنجليزي يتعرضوا صح)
  const html = [];
  let quote = [];
  const flushQuote = () => {
    if (quote.length) {
      html.push(`<blockquote dir="auto">${quote.join('<br>')}</blockquote>`);
      quote = [];
    }
  };

  for (const line of out.split('\n')) {
    const q = line.match(/^&gt; (.*)$/);
    if (q) {
      quote.push(q[1]);
      continue;
    }
    flushQuote();

    const h = line.match(/^(#{1,3}) (.+)$/);
    if (h) {
      html.push(`<div class="h${h[1].length}" dir="auto">${h[2]}</div>`);
      continue;
    }
    const sub = line.match(/^-# (.+)$/);
    if (sub) {
      html.push(`<div class="subtext" dir="auto">${sub[1]}</div>`);
      continue;
    }
    html.push(`<div class="line" dir="auto">${line === '' ? '<br>' : line}</div>`);
  }
  flushQuote();

  let result = html.join('');
  for (let i = 0; i < 5 && /\u0000\d+\u0000/.test(result); i++) {
    result = result.replace(/\u0000(\d+)\u0000/g, (_, n) => stash[Number(n)] ?? '');
  }
  return result;
}

// =====================================================
// أجزاء الرسالة
// =====================================================

const BUTTON_STYLES = { 1: 'primary', 2: 'secondary', 3: 'success', 4: 'danger', 5: 'secondary' };

function renderEmbed(e, ctx) {
  const color = isHex(e.color) ? e.color : '#4e5058';
  const thumb = safeUrl(e.thumbnail);
  const image = safeUrl(e.image);

  // لينك بريفيو صورة/جيف بس (من غير نص)
  if (!e.title && !e.description && !e.authorName && !(e.fields || []).length && (thumb || image)) {
    return `<div class="embed-bare"><img class="embed-img" src="${image || thumb}" alt=""></div>`;
  }

  const parts = [];

  if (e.authorName) {
    const icon = safeUrl(e.authorIcon);
    parts.push(
      `<div class="embed-author">${icon ? `<img src="${icon}" alt="">` : ''}<span dir="auto">${esc(e.authorName)}</span></div>`
    );
  }
  if (e.title) {
    const url = safeUrl(e.url);
    const title = url
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${esc(e.title)}</a>`
      : esc(e.title);
    parts.push(`<div class="embed-title" dir="auto">${title}</div>`);
  }
  if (e.description) {
    parts.push(`<div class="embed-desc">${renderMarkdown(e.description, ctx)}</div>`);
  }
  if ((e.fields || []).length) {
    const fields = e.fields
      .map(
        (f) =>
          `<div class="field${f.inline ? ' inline' : ''}">` +
          `<div class="field-name" dir="auto">${renderMarkdown(f.name, ctx)}</div>` +
          `<div class="field-value">${renderMarkdown(f.value, ctx)}</div></div>`
      )
      .join('');
    parts.push(`<div class="fields">${fields}</div>`);
  }
  if (image) parts.push(`<img class="embed-img" src="${image}" alt="">`);
  if (e.footer || e.timestamp) {
    const icon = safeUrl(e.footerIcon);
    const time = e.timestamp ? `<time datetime="${esc(e.timestamp)}">${esc(e.timestamp)}</time>` : '';
    parts.push(
      `<div class="embed-footer">${icon ? `<img src="${icon}" alt="">` : ''}` +
        `<span dir="auto">${esc(e.footer || '')}</span>${e.footer && time ? ' • ' : ''}${time}</div>`
    );
  }

  return (
    `<div class="embed" style="border-left-color:${color}">` +
    `<div class="embed-main">${parts.join('')}</div>` +
    (thumb ? `<img class="embed-thumb" src="${thumb}" alt="">` : '') +
    `</div>`
  );
}

function renderAttachment(a) {
  const isImage = /^image\/(png|jpe?g|gif|webp)$/i.test(a.type || '');
  const src = safeUrl(a.src || a.url);
  const link = safeUrl(a.url);
  if (isImage && src) {
    return `<div class="att"><a href="${link || src}" target="_blank" rel="noopener noreferrer"><img class="att-img" src="${src}" alt="${esc(a.name)}"></a></div>`;
  }
  const size = a.size ? ` <span class="size">${(a.size / 1024).toFixed(a.size > 1048576 ? 0 : 1)} KB</span>` : '';
  const icon = /^video\//i.test(a.type || '') ? '🎬' : /^audio\//i.test(a.type || '') ? '🎵' : '📄';
  return `<div class="att file">${icon} ${
    link ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>` : esc(a.name)
  }${size}</div>`;
}

function renderButtons(buttons) {
  if (!buttons?.length) return '';
  const items = buttons
    .map(
      (b) =>
        `<span class="btn btn-${BUTTON_STYLES[b.style] || 'secondary'}">${b.emoji ? esc(b.emoji) + ' ' : ''}${esc(b.label || '')}</span>`
    )
    .join('');
  return `<div class="buttons">${items}</div>`;
}

const GROUP_WINDOW_MS = 7 * 60 * 1000;

function renderMessages(messages, ctx) {
  const html = [];
  let prev = null;
  let prevDay = null;

  for (const m of messages) {
    const day = new Date(m.ts).toISOString().slice(0, 10);
    let newDay = false;
    if (day !== prevDay) {
      newDay = true;
      html.push(
        `<div class="divider"><span><time datetime="${new Date(m.ts).toISOString()}" data-date="1">${day}</time></span></div>`
      );
      prevDay = day;
    }

    const grouped =
      !newDay && prev && prev.authorId === m.authorId && !m.reply && m.ts - prev.ts < GROUP_WINDOW_MS;

    const body = [];

    if (m.reply) {
      body.push(
        `<div class="reply"><span class="reply-arrow">↪</span>` +
          (safeUrl(m.reply.avatar) ? `<img src="${safeUrl(m.reply.avatar)}" alt="">` : '') +
          `<span class="reply-name">@${esc(m.reply.name)}</span>` +
          `<span class="reply-text" dir="auto">${esc(m.reply.snippet)}</span></div>`
      );
    }

    if (!grouped) {
      const nameStyle = isHex(m.authorColor) ? ` style="color:${m.authorColor}"` : '';
      body.push(
        `<div class="head"><span class="name"${nameStyle} dir="auto">${esc(m.authorName)}</span>` +
          (m.bot ? '<span class="app-tag">APP</span>' : '') +
          `<time datetime="${new Date(m.ts).toISOString()}">${esc(new Date(m.ts).toISOString().replace('T', ' ').slice(0, 16))} UTC</time>` +
          `</div>`
      );
    }

    if (m.content) {
      body.push(
        `<div class="content">${renderMarkdown(m.content, ctx)}${m.edited ? '<span class="edited">(edited)</span>' : ''}</div>`
      );
    }
    for (const s of m.stickers || []) body.push(`<div class="att file">🏷️ Sticker: ${esc(s)}</div>`);
    for (const a of m.attachments || []) body.push(renderAttachment(a));
    for (const e of m.embeds || []) body.push(renderEmbed(e, ctx));
    body.push(renderButtons(m.buttons));

    const avatar = grouped
      ? '<div class="avatar-space"></div>'
      : `<img class="avatar" src="${safeUrl(m.authorAvatar) || 'https://cdn.discordapp.com/embed/avatars/0.png'}" alt="">`;

    html.push(`<div class="msg${grouped ? ' grouped' : ''}">${avatar}<div class="body">${body.join('')}</div></div>`);
    prev = m;
  }

  return html.join('\n');
}

// =====================================================
// الصفحة كلها
// =====================================================

const CSS = `
*{box-sizing:border-box}
body{margin:0;background:#313338;color:#dbdee1;font-family:"gg sans","Segoe UI",Tahoma,"Noto Sans Arabic",Arial,sans-serif;font-size:16px;line-height:1.375}
a{color:#00a8fc;text-decoration:none}a:hover{text-decoration:underline}
.top{background:#2b2d31;border-bottom:1px solid #1e1f22;padding:16px 20px;position:sticky;top:0;z-index:5}
.top-row{display:flex;align-items:center;gap:12px}
.guild-icon{width:44px;height:44px;border-radius:50%;background:#5865f2;object-fit:cover;flex:none}
.guild-name{font-weight:700;color:#f2f3f5;font-size:17px}
.chan{color:#949ba4;font-size:14px}
.info{display:flex;flex-wrap:wrap;gap:6px 22px;margin-top:10px;font-size:13px;color:#b5bac1}
.info b{color:#f2f3f5;font-weight:600}
.wrap{max-width:1000px;margin:0 auto;padding:12px 0 40px}
.msg{display:flex;gap:16px;padding:2px 20px;position:relative}
.msg:hover{background:#2e3035}
.msg:not(.grouped){margin-top:17px}
.avatar{width:40px;height:40px;border-radius:50%;flex:none;margin-top:2px;background:#1e1f22}
.avatar-space{width:40px;flex:none}
.body{min-width:0;flex:1}
.head{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.name{font-weight:500;color:#f2f3f5}
.app-tag{background:#5865f2;color:#fff;font-size:10px;font-weight:600;border-radius:4px;padding:1px 5px;align-self:center}
.head time{font-size:12px;color:#949ba4}
.content,.embed-desc,.field-value{word-wrap:break-word;overflow-wrap:anywhere}
.line{min-height:1.375em}
.edited{font-size:10px;color:#949ba4;margin:0 4px}
.mention{background:rgba(88,101,242,.3);color:#c9cdfb;border-radius:3px;padding:0 2px;font-weight:500}
.emoji{width:22px;height:22px;vertical-align:bottom;object-fit:contain}
code.inline{background:#1e1f22;border-radius:4px;padding:1px 5px;font-family:Consolas,monospace;font-size:14px}
pre{background:#1e1f22;border:1px solid #232428;border-radius:6px;padding:8px 10px;margin:4px 0;overflow-x:auto;font-family:Consolas,monospace;font-size:14px;white-space:pre-wrap}
blockquote{margin:2px 0;padding:0 10px;border-inline-start:4px solid #4e5058}
.h1{font-size:1.5em;font-weight:700}.h2{font-size:1.25em;font-weight:700}.h3{font-size:1.1em;font-weight:700}
.subtext{font-size:12px;color:#949ba4}
.spoiler{background:#1e1f22;color:transparent;border-radius:3px;cursor:pointer;padding:0 2px}
.spoiler.revealed{background:#3b3d44;color:inherit}
.reply{display:flex;align-items:center;gap:6px;font-size:13px;color:#b5bac1;margin-bottom:2px;overflow:hidden;white-space:nowrap}
.reply-arrow{color:#4e5058}
.reply img{width:16px;height:16px;border-radius:50%}
.reply-name{font-weight:500;color:#dbdee1}
.reply-text{overflow:hidden;text-overflow:ellipsis}
.att{margin-top:4px}
.att-img{max-width:min(420px,100%);max-height:350px;border-radius:6px;display:block}
.file{display:inline-block;background:#2b2d31;border:1px solid #1e1f22;border-radius:6px;padding:8px 12px;font-size:14px}
.size{color:#949ba4;font-size:12px}
.embed{display:flex;gap:16px;background:#2b2d31;border-left:4px solid #4e5058;border-radius:4px;padding:8px 16px 16px 12px;margin-top:4px;max-width:520px}
.embed-main{min-width:0;flex:1}
.embed-author,.embed-footer{display:flex;align-items:center;gap:8px;font-size:13px;margin-top:8px}
.embed-author img,.embed-footer img{width:20px;height:20px;border-radius:50%}
.embed-footer{font-size:12px;color:#b5bac1}
.embed-title{font-weight:700;color:#f2f3f5;margin-top:8px}
.embed-desc{font-size:14px;margin-top:8px}
.fields{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px}
.field{grid-column:1/-1}.field.inline{grid-column:auto}
.field-name{font-weight:700;font-size:14px;color:#f2f3f5}
.field-value{font-size:14px}
.embed-thumb{width:80px;height:80px;border-radius:4px;object-fit:cover;flex:none;margin-top:8px}
.embed-img{max-width:100%;border-radius:4px;margin-top:12px;display:block}
.embed-bare .embed-img{max-width:min(400px,100%);margin-top:4px}
.buttons{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.btn{font-size:14px;font-weight:500;padding:2px 16px;min-height:32px;display:inline-flex;align-items:center;border-radius:3px;color:#fff}
.btn-primary{background:#5865f2}.btn-secondary{background:#4e5058}.btn-success{background:#248046}.btn-danger{background:#da373c}
.divider{display:flex;align-items:center;margin:20px 16px 6px;color:#949ba4;font-size:12px;font-weight:600}
.divider:before,.divider:after{content:"";flex:1;height:1px;background:#3f4147}
.divider span{padding:0 8px}
.foot{text-align:center;color:#949ba4;font-size:12px;margin-top:30px}
`;

const SCRIPT = `
document.querySelectorAll('time[datetime]').forEach(function(t){
  var d = new Date(t.getAttribute('datetime'));
  if (isNaN(d)) return;
  t.textContent = t.hasAttribute('data-date')
    ? d.toLocaleDateString(undefined,{dateStyle:'long'})
    : d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
});
document.querySelectorAll('.spoiler').forEach(function(s){
  s.addEventListener('click', function(){ s.classList.add('revealed'); });
});
`;

/**
 * opts: {
 *   guildName, guildIcon, channelName,
 *   info: [{ label, value }],
 *   messages: [{ id, ts, authorId, authorName, authorAvatar, authorColor, bot, content, edited,
 *                reply:{name,snippet,avatar}|null,
 *                attachments:[{name,url,type,size,src}], embeds:[...], buttons:[...], stickers:[...] }],
 *   ctx: { users:{id:name}, roles:{id:{name,color}}, channels:{id:name} },
 * }
 */
function buildTranscriptHtml(opts) {
  const { guildName = 'Server', guildIcon, channelName = 'ticket', info = [], messages = [], ctx = {} } = opts;

  const icon = safeUrl(guildIcon);
  const infoHtml = info
    .filter((i) => i && i.value !== undefined && i.value !== null && i.value !== '')
    .map((i) => `<span dir="auto"><b>${esc(i.label)}:</b> ${esc(i.value)}</span>`)
    .join('');

  return (
    `<!DOCTYPE html>\n<html lang="ar">\n<head>\n<meta charset="utf-8">\n` +
    `<meta name="viewport" content="width=device-width,initial-scale=1">\n` +
    `<title>${esc(channelName)} — Transcript</title>\n<style>${CSS}</style>\n</head>\n<body>\n` +
    `<div class="top"><div class="top-row">` +
    (icon ? `<img class="guild-icon" src="${icon}" alt="">` : `<div class="guild-icon"></div>`) +
    `<div><div class="guild-name" dir="auto">${esc(guildName)}</div><div class="chan"># ${esc(channelName)}</div></div></div>` +
    `<div class="info">${infoHtml}</div></div>\n` +
    `<div class="wrap">\n${renderMessages(messages, ctx)}\n` +
    `<div class="foot">— نهاية المحادثة • ${messages.length} رسالة —</div></div>\n` +
    `<script>${SCRIPT}</script>\n</body>\n</html>`
  );
}

module.exports = { buildTranscriptHtml, renderMarkdown };
