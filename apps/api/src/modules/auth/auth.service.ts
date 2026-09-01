import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { ApiConfigService } from '../../config/config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserProfileDto } from './dto/user-profile.dto';

interface RefreshTokenJwtPayload {
  sub: string;
  jti: string;
  familyId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ApiConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserProfileDto;
  }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('El correo electronico ya esta registrado');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const tokens = await this.generateTokenPair(user.id, user.email);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserProfileDto;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const tokens = await this.generateTokenPair(user.id, user.email);

    const userProfile: UserProfileDto = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userProfile,
    };
  }

  async refreshToken(rawRefreshToken: string | undefined): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserProfileDto;
  }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token no proporcionado');
    }

    let payload: RefreshTokenJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenJwtPayload>(rawRefreshToken, {
        secret: this.configService.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    // Deteccion de reutilizacion / robo de token:
    if (!tokenRecord || tokenRecord.isRevoked) {
      if (payload.familyId) {
        await this.prisma.refreshToken.updateMany({
          where: { familyId: payload.familyId },
          data: { isRevoked: true },
        });
      }
      throw new UnauthorizedException(
        'Reutilizacion de token detectada. La sesion ha sido revocada por seguridad.',
      );
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('El refresh token ha expirado');
    }

    const isTokenValid = await argon2.verify(tokenRecord.tokenHash, rawRefreshToken);
    if (!isTokenValid) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Refresh token no coincide con el registro');
    }

    // Invalida el token actual (Rotacion)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('El usuario ya no existe');
    }

    // Genera un nuevo par manteniendo la misma familia de tokens
    const tokens = await this.generateTokenPair(user.id, user.email, payload.familyId);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  async logout(rawRefreshToken: string | undefined): Promise<{ message: string }> {
    if (rawRefreshToken) {
      try {
        const payload = this.jwtService.decode<RefreshTokenJwtPayload | null>(rawRefreshToken);
        if (payload?.jti) {
          await this.prisma.refreshToken.updateMany({
            where: { id: payload.jti },
            data: { isRevoked: true },
          });
        }
      } catch {
        // Silencioso al cerrar sesion
      }
    }
    return { message: 'Sesion cerrada exitosamente' };
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    existingFamilyId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const familyId = existingFamilyId ?? randomUUID();
    const tokenId = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        secret: this.configService.jwtAccessSecret,
        expiresIn: this.configService.jwtAccessExpiresIn as
          `${number}m` | `${number}d` | `${number}s` | `${number}h` | number,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti: tokenId, familyId },
      {
        secret: this.configService.jwtRefreshSecret,
        expiresIn: this.configService.jwtRefreshExpiresIn as
          `${number}m` | `${number}d` | `${number}s` | `${number}h` | number,
      },
    );

    const tokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        familyId,
        tokenHash,
        expiresAt,
        isRevoked: false,
      },
    });

    return { accessToken, refreshToken };
  }
}
