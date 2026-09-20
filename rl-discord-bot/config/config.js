// ============================================================
//  كل الإعدادات القابلة للتعديل بدون لمس بقية الكود
// ============================================================
module.exports = {
  // ---- روم الترحيب ----
  welcomeChannel: '👋・welcome',

  // ---- نظام التذاكر ----
  ticketCategory: '🎫 SUPPORT',
  ticketChannel: '🎫・tickets',
  // false = صاحب التذكرة يستطيع إغلاقها أيضًا | true = الـ Staff فقط
  ticketCloseStaffOnly: false,

  // ---- الرتب المخوّلة بالإدارة (Staff) ----
  staffRoles: ['Owner', 'Admin', 'High Administration', 'Moderator'],

  // ---- الرتبة المستخدمة في /roster ----
  rosterRole: 'Team',

  // ---- الرتب المسموح حذفها عبر /delete-roles ----
  // ⚠️ فارغة عمدًا للأمان. أضف أسماء الرتب هنا صراحة لتفعيل حذفها،
  // مثال: ["Old Rank", "Test Role"]
  // لن يتم حذف @everyone أو رتب البوت أو أي رتبة أعلى من/تساوي رتبة البوت
  // بغض النظر عمّا تضعه هنا.
  deletableRoleNames: [],

  // ---- هيكل السيرفر: Categories ----
  categories: {
    information: '📢 INFORMATION',
    rocketLeague: '🚗 ROCKET LEAGUE',
    team: '👥 TEAM',
    support: '🎫 SUPPORT',
    voice: '🔊 VOICE',
  },

  // ---- هيكل السيرفر: Text Channels لكل Category ----
  channels: {
    information: ['👋・welcome', '📜・rules', '📢・announcements', '📰・team-news'],
    rocketLeague: ['💬・general', '🎮・gaming', '🏆・matches', '🔥・clips', '🎥・videos', '📸・media'],
    team: ['👥・team-chat', '🧠・strategies', '🗓️・training', '🏆・tournaments'],
    support: ['🎫・tickets'],
  },

  // ---- هيكل السيرفر: Voice Channels ----
  voiceChannels: ['🔊・Lobby', '🎮・Rocket League 1', '🎮・Rocket League 2', '🏆・Match Room'],

  // ---- ألوان الـ Embeds (Gaming / Rocket League theme) ----
  colors: {
    primary: 0xff7a00, // برتقالي Rocket League
    success: 0x57f287,
    danger: 0xed4245,
    info: 0x1abc9c,
  },
};
