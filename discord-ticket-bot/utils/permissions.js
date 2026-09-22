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

module.exports = { isStaff };
