import {
  CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Member } from './users.repository.js';

/**
 * Office managers only. Runs after the global authentication guard, which puts
 * the member on the request (AuthenticationContext only opens around the
 * handler, after the guards).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const member = context
      .switchToHttp()
      .getRequest<{ user?: Member | null }>().user;
    if (member?.role !== 'admin') {
      throw new ForbiddenException({
        code: 'admin_only',
        message: 'Reserved to office managers',
      });
    }
    return true;
  }
}
