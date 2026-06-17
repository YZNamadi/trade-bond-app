import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { setRequestUser } from '../observability/request-context';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: any) => req?.cookies?.access_token,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const userId = payload?.sub as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.usersService.findAuthUserById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    try {
      setRequestUser(user.id, user.role);
    } catch {}
    return { userId: user.id, email: user.email, role: user.role };
  }
}
