// utils/settingsManager.js
// إعدادات كل سيرفر (guild) في ملف واحد: data/settings.json
// نسخة Node.js من settings_manager.py

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'settings.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');
}

function readAll() {
  try {
    ensureFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('❌ فشل قراءة ملف الإعدادات، هيتم البدء بإعدادات فاضية:', err);
    return {};
  }
}

function writeAll(data) {
  try {
    ensureFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ فشل حفظ ملف الإعدادات:', err);
  }
}

function defaultGuildSettings() {
  return {
    logs: {
      general: null,
      messages: null,
      members: null,
      moderation: null,
      server: null,
      roles: null,
      voice: null,
      tickets: null,
    },
    security: { channelId: null },
  };
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// يدمج الإعدادات المخزنة فوق الافتراضية (عشان الحقول الجديدة متكسرش القديمة)
function deepMerge(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    result[key] = isObj(value) && isObj(result[key]) ? deepMerge(result[key], value) : value;
  }
  return result;
}

function getGuildSettings(guildId) {
  guildId = String(guildId);
  const all = readAll();
  if (!all[guildId]) {
    all[guildId] = defaultGuildSettings();
    writeAll(all);
  }
  return deepMerge(defaultGuildSettings(), all[guildId]);
}

// partialUpdate ممكن يكون متداخل زي { logs: { general: '123' } }
function updateGuildSettings(guildId, partialUpdate) {
  guildId = String(guildId);
  const all = readAll();
  const current = deepMerge(defaultGuildSettings(), all[guildId] || {});
  all[guildId] = deepMerge(current, partialUpdate);
  writeAll(all);
  return all[guildId];
}

module.exports = { getGuildSettings, updateGuildSettings };
