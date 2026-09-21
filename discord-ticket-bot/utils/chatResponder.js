// utils/chatResponder.js
// Handles the "mention the bot" / "reply to the bot" chat feature.
// If AI_API_KEY is configured, tries the Anthropic Messages API.
// If it's not configured, or the call fails for any reason, falls
// back to a small set of canned responses (English + Arabic) so the
// bot never crashes or goes silent.

const config = require('./config');

const FALLBACK_RESPONSES = [
  { en: 'Hey! 👋 How can I help you?', ar: 'أهلاً! 👋 كيف أقدر أساعدك؟' },
  { en: "I'm here! Let me know what you need.", ar: 'أنا موجود! خبرني وش تحتاج.' },
  { en: 'Hi there! Feel free to open a ticket if you need Staff support.', ar: 'هلا! افتح تذكرة إذا احتجت مساعدة من فريق الإدارة.' },
];

function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}

function fallbackResponse(content) {
  const pick = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
  return isArabic(content) ? pick.ar : pick.en;
}

async function getAiResponse(content) {
  if (!config.aiApiKey) return null;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system:
          'You are a friendly, concise Discord community bot. Reply naturally in the same language ' +
          '(Arabic or English) the user wrote in. Keep replies short (1-3 sentences).',
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      console.error('[CHAT] AI API returned non-OK status:', response.status);
      return null;
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return text || null;
  } catch (err) {
    console.error('[CHAT] AI API call failed, using fallback:', err.message);
    return null;
  }
}

/**
 * Returns the text the bot should reply with. Never throws.
 */
async function getReply(content) {
  const aiReply = await getAiResponse(content);
  if (aiReply) return aiReply;
  return fallbackResponse(content);
}

module.exports = { getReply };
