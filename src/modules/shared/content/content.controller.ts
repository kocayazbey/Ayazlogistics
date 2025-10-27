import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { ContentService } from './content.service';

@ApiTags('Content Management')
@Controller({ path: 'content', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ========== PAGES ==========
  @Get('pages')
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get all pages' })
  async getPages(@CurrentUser('tenantId') tenantId: string) {
    return this.contentService.getPages(tenantId);
  }

  @Post('pages')
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create new page' })
  async createPage(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.contentService.createPage(tenantId, data);
  }

  @Put('pages/:id')
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Update page' })
  async updatePage(@Param('id') id: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.contentService.updatePage(id, tenantId, data);
  }

  @Delete('pages/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete page' })
  async deletePage(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.contentService.deletePage(id, tenantId);
  }

  // ========== BLOGS ==========
  @Get('blogs')
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get all blogs' })
  async getBlogs(@CurrentUser('tenantId') tenantId: string) {
    return this.contentService.getBlogs(tenantId);
  }

  @Post('blogs')
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create new blog post' })
  async createBlog(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.contentService.createBlog(tenantId, data);
  }

  // ========== BANNERS ==========
  @Get('banners')
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get all banners' })
  async getBanners(@CurrentUser('tenantId') tenantId: string) {
    return this.contentService.getBanners(tenantId);
  }

  @Post('banners')
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create new banner' })
  async createBanner(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.contentService.createBanner(tenantId, data);
  }

  // ========== FAQ ==========
  @Get('faq')
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Get all FAQs' })
  async getFAQs(@CurrentUser('tenantId') tenantId: string) {
    return this.contentService.getFAQs(tenantId);
  }

  @Post('faq')
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create new FAQ' })
  async createFAQ(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.contentService.createFAQ(tenantId, data);
  }
}
