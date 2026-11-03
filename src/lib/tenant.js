export function getOrganizationIdForUser(user) {
  if (!user) return null;
  if (user.organizationId) return user.organizationId;
  if (user.organization?.id) return user.organization.id;
  return null;
}

export function withOrganizationScope(user, where = {}) {
  const organizationId = getOrganizationIdForUser(user);

  if (!organizationId) {
    return where;
  }

  return {
    ...where,
    organizationId,
  };
}

export function withOrganizationRelationScope(user, where = {}) {
  const organizationId = getOrganizationIdForUser(user);

  if (!organizationId) {
    return where;
  }

  return {
    ...where,
    dealer: {
      ...(where.dealer || {}),
      organizationId,
    },
  };
}
