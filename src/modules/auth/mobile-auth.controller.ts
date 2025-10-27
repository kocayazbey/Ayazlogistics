import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { MobileAuthService } from './mobile-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
export class MobileAuthController {
  constructor(private readonly authService: MobileAuthService) {}

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    return this.authService.validateUserAndLogin(loginDto.email, loginDto.password);
  }

  @Post('register')
  async register(@Body() registerDto: any) {
    return this.authService.registerUser(registerDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getUserProfile(req.user.id);
  }

  @Post('refresh-token')
  async refreshToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any) {
    return this.authService.logout(req.user.id);
  }

  @Post('biometric-register')
  @UseGuards(JwtAuthGuard)
  async registerBiometric(@Request() req: any, @Body() body: { deviceId: string; biometricData: string }) {
    return this.authService.registerBiometric(req.user.id, body.deviceId, body.biometricData);
  }

  @Post('biometric-login')
  async biometricLogin(@Body() body: { deviceId: string; biometricToken: string }) {
    return this.authService.biometricLogin(body.deviceId, body.biometricToken);
  }
}

