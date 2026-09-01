import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ApiConfigService } from '../../config/config.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, MessageResponseDto } from './dto/auth-response.dto';
import { UserProfileDto } from './dto/user-profile.dto';

const REFRESH_COOKIE_NAME = 'refresh_token';

@ApiTags('Autenticacion')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ApiConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registro de nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente', type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'El correo electronico ya esta registrado' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inicio de sesion con credenciales' })
  @ApiResponse({ status: 200, description: 'Autenticacion exitosa', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciales invalidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovacion de access token mediante refresh token con rotacion' })
  @ApiResponse({ status: 200, description: 'Token renovado exitosamente', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Refresh token invalido o reutilizado' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ): Promise<AuthResponseDto> {
    const token = (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) ?? bodyToken;
    const result = await this.authService.refreshToken(token);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cierre de sesion e invalidacion del refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Sesion cerrada exitosamente',
    type: MessageResponseDto,
  })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body('refreshToken') bodyToken?: string,
  ): Promise<MessageResponseDto> {
    const token = (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) ?? bodyToken;
    const result = await this.authService.logout(token);
    this.clearRefreshTokenCookie(res);
    return result;
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil de usuario', type: UserProfileDto })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  getProfile(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.configService.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
