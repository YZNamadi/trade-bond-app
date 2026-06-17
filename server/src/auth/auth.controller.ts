import { Controller, Request, Post, UseGuards, Body, Get, UnauthorizedException, Res, Req, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { CookieOptions, Response, Request as ExpressRequest } from 'express';
import { randomBytes } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RateLimit } from '../rate-limit/rate-limit.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private cookieOptions(): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite: 'strict' | 'lax' = isProd ? 'strict' : 'lax';
    return {
      httpOnly: true,
      sameSite,
      secure: isProd,
      path: '/api',
    };
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite: 'strict' | 'lax' = isProd ? 'strict' : 'lax';
    const secure = isProd;

    const clear = (name: string, path: string, httpOnly: boolean) => {
      res.clearCookie(name, { path, httpOnly, sameSite, secure });
    };

    clear('access_token', '/api', true);
    clear('access_token', '/', true);
    clear('refresh_token', '/api/auth/refresh', true);
    clear('refresh_token', '/api', true);
    clear('refresh_token', '/', true);
    clear('csrf_token', '/', false);
    clear('device_id', '/', false);
  }

  private csrfCookieOptions(): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';
    const sameSite: 'strict' | 'lax' = isProd ? 'strict' : 'lax';
    return {
      httpOnly: false,
      sameSite,
      secure: isProd,
      path: '/',
    };
  }

  private refreshCookieOptions(): CookieOptions {
    const base = this.cookieOptions();
    const days30 = 30 * 24 * 60 * 60 * 1000;
    return { ...base, path: '/api/auth/refresh', maxAge: days30 };
  }

  private accessCookieOptions(): CookieOptions {
    const base = this.cookieOptions();
    const minutes15 = 15 * 60 * 1000;
    return { ...base, maxAge: minutes15 };
  }

  private deviceCookieOptions(): CookieOptions {
    const base = this.cookieOptions();
    const days180 = 180 * 24 * 60 * 60 * 1000;
    return { ...base, path: '/', maxAge: days180 };
  }

  private setCsrfCookie(res: Response) {
    const token = randomBytes(32).toString('base64url');
    res.cookie('csrf_token', token, this.csrfCookieOptions());
  }

  @Post('login')
  @RateLimit('auth_login')
  async login(
    @Body() body: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    this.clearAuthCookies(res);
    const deviceId = (req as any).cookies?.device_id || randomBytes(16).toString('base64url');
    res.cookie('device_id', deviceId, this.deviceCookieOptions());
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress || null;
    const user = await this.authService.validateUser(body.email, body.password, { ip, userAgent: userAgent || null });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { accessToken, refreshToken, user: safeUser } = await this.authService.login(user, { deviceId, ip, userAgent: userAgent || null });
    res.cookie('access_token', accessToken, this.accessCookieOptions());
    res.cookie('refresh_token', refreshToken, this.refreshCookieOptions());
    this.setCsrfCookie(res);
    return { user: safeUser };
  }

  @Post('register')
  @RateLimit('auth_register')
  async register(
    @Body() body: RegisterDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
  ) {
    this.clearAuthCookies(res);
    const deviceId = (req as any).cookies?.device_id || randomBytes(16).toString('base64url');
    res.cookie('device_id', deviceId, this.deviceCookieOptions());
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress || null;
    const { accessToken, refreshToken, user } = await this.authService.register(body, { deviceId, ip, userAgent: userAgent || null });
    res.cookie('access_token', accessToken, this.accessCookieOptions());
    res.cookie('refresh_token', refreshToken, this.refreshCookieOptions());
    this.setCsrfCookie(res);
    return { user };
  }

  @Post('refresh')
  async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    this.clearAuthCookies(res);
    const refreshToken = (req as any).cookies?.refresh_token as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const deviceId = (req as any).cookies?.device_id as string | undefined;
    if (!deviceId) {
      throw new UnauthorizedException('Missing device session');
    }
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress || null;
    const userAgent = (req.headers['user-agent'] as string | undefined) || null;
    const { accessToken, refreshToken: nextRefreshToken } = await this.authService.refresh(refreshToken, { deviceId, ip, userAgent });
    res.cookie('access_token', accessToken, this.accessCookieOptions());
    res.cookie('refresh_token', nextRefreshToken, this.refreshCookieOptions());
    this.setCsrfCookie(res);
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.userId);
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    this.setCsrfCookie(res);
    return this.authService.getProfile(req.user.userId);
  }
}
