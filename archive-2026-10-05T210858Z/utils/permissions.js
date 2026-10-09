// utils/permissions.js
const config = require('./config');

/**
 * Returns true if the given guild member has at least one of the
 * configured staff role IDs. Role IDs are used deliberately instead
 * of role names so this keeps working even if roles get renamed.
 */
function isStaff(member) {
  if (!member || !member.roles || !member.roles.cache) return false;
  if (config.staffRoleIds.length === 0) return false;
  return member.roles.cache.some((role) => config.staffRoleIds.includes(role.id));
}

function parseIds(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

/**
 * رول(ات) السبورت — الوحيدين اللي يقدروا يستلموا التذاكر.
 * بيقرأ من الملف بالترتيب ده (أول متغير فيه قيمة):
 *   SUPPORT_ROLE_ID  ←  TICKET_PING_ROLE_SUPPORT_ID  ←  TICKET_PING_ROLE_ID
 * (ممكن أكتر من آيدي مفصولين بفاصلة)
 */
function getSupportRoleIds() {
  return parseIds(
    process.env.SUPPORT_ROLE_ID ||
      process.env.TICKET_PING_ROLE_SUPPORT_ID ||
      process.env.TICKET_PING_ROLE_ID
  );
}

function isSupport(member) {
  if (!member || !member.roles || !member.roles.cache) return false;
  const ids = getSupportRoleIds();
  if (ids.length === 0) return false;
  return member.roles.cache.some((role) => ids.includes(role.id));
}

module.exports = { isStaff, isSupport, getSupportRoleIds };
