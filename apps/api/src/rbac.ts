import type { RequestHandler } from 'express';

import { ApiError } from './api-response.js';
import type { AuthenticatedUser } from './identity.js';

export const publicationAdminRoles: AuthenticatedUser['roles'] = ['ADMIN', 'SUPER_ADMIN'];

export function requirePublicationAdmin(user: AuthenticatedUser): void {
  if (!user.roles.some((role) => publicationAdminRoles.includes(role)))
    throw new ApiError(
      403,
      'ADMIN_APPROVAL_REQUIRED',
      'Only an administrator may approve, schedule or publish news.',
    );
}

export function requireAuthentication(): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
      return;
    }
    next();
  };
}

export function requirePermission(permission: string): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
      return;
    }
    if (!request.auth.permissions.includes('*') && !request.auth.permissions.includes(permission)) {
      next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
      return;
    }
    next();
  };
}
