import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req?.user;
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    if (user.role !== 'admin') {
      throw new ForbiddenException('Not allowed');
    }
    const expected = process.env.ADMIN_API_TOKEN;
    if (expected) {
      const provided = req.headers?.['x-admin-token'];
      if (typeof provided !== 'string' || provided !== expected) {
        throw new ForbiddenException('Not allowed');
      }
    }
    return true;
  }
}

