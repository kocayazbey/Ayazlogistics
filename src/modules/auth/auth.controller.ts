import { Controller, Post, Get, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { StrictRateLimit, StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { LoginDto, RegisterDto, RefreshTokenDto, ForgotPasswordDto, ResetPasswordDto } from './dto/login.dto';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(RateLimitGuard)
  @StrictRateLimit() // 5 requests per 15 minutes for login
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(@Body() credentials: LoginDto) {
    return await this.authService.login(credentials.email, credentials.password);
  }

  @Post('register')
  @UseGuards(RateLimitGuard)
  @StrictRateLimit() // 5 requests per 15 minutes for registration
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async register(@Body() userData: RegisterDto) {
    return await this.authService.register(userData);
  }

  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @StandardRateLimit() // 100 requests per 15 minutes
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() data: RefreshTokenDto) {
    return await this.authService.refreshToken(data.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @StandardRateLimit()
  async logout(@Request() req) {
    return await this.authService.logout(req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @StandardRateLimit()
  async getProfile(@Request() req) {
    return await this.authService.getProfile(req.user.id);
  }

  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  @StrictRateLimit() // Prevent abuse
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    return await this.authService.forgotPassword(data.email);
  }

  @Post('reset-password')
  @UseGuards(RateLimitGuard)
  @StrictRateLimit() // Prevent abuse
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token or password' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resetPassword(@Body() data: ResetPasswordDto) {
    return await this.authService.resetPassword(data.token, data.newPassword);
  }

  @Post('validate')
  @UseGuards(RateLimitGuard)
  @StandardRateLimit()
  async validateToken(@Headers('authorization') authHeader: string) {
    try {
      const token = authHeader?.replace('Bearer ', '');
      if (!token) {
        return { valid: false, message: 'No token provided' };
      }

      const isValid = await this.authService.validateToken(token);
      return { valid: isValid };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }
}

