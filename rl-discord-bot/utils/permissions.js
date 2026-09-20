/**
 * يتحقق أن العضو يملك "أعلى Role" فعليًا في السيرفر (وليس مجرد Administrator).
 *
 * - صاحب السيرفر (Owner) يمر دائمًا، حتى لو لم يملك أي رتبة.
 * - يتم استبعاد رتب البوتات/التكاملات (managed roles) من حساب "الأعلى"،
 *   حتى لا يُقفَل الأمر على الجميع بسبب رتبة بوت عالية.
 * - إن وُجد أكثر من عضو بنفس أعلى Position، يمر جميعهم (سلوك متوقّع ومقصود).
 */
function isHighestRole(member) {
  if (!member || !member.guild) return false;

  const guild = member.guild;

  if (member.id === guild.ownerId) return true;

  const assignableRoles = guild.roles.cache.filter(
    (role) => role.id !== guild.id && !role.managed
  );

  if (assignableRoles.size === 0) return false;

  const highestPosition = Math.max(...assignableRoles.map((r) => r.position));
  const memberHighest = member.roles.highest;

  return memberHighest.id !== guild.id && memberHighest.position === highestPosition;
}

/**
 * يتحقق أن البوت يملك كل الصلاحيات المطلوبة على مستوى السيرفر.
 * يرجع { ok, missing, me }.
 */
async function checkBotPermissions(guild, permissionsList) {
  const me = guild.members.me ?? (await guild.members.fetchMe());
  const missing = permissionsList.filter((p) => !me.permissions.has(p));
  return { ok: missing.length === 0, missing, me };
}

module.exports = { isHighestRole, checkBotPermissions };
