import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';

@Injectable()
export class ContentService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  // ========== PAGES ==========
  async getPages(tenantId: string) {
    try {
      const pages = [
        { id: '1', title: 'Ana Sayfa', slug: 'home', status: 'published', updatedAt: '2025-01-15' },
        { id: '2', title: 'Hakkımızda', slug: 'about', status: 'published', updatedAt: '2025-01-14' },
        { id: '3', title: 'İletişim', slug: 'contact', status: 'published', updatedAt: '2025-01-13' },
      ];
      return { data: pages, total: pages.length };
    } catch (error) {
      return { data: [], total: 0 };
    }
  }

  async createPage(tenantId: string, data: any) {
    return { ...data, id: Date.now().toString(), tenantId, createdAt: new Date() };
  }

  async updatePage(id: string, tenantId: string, data: any) {
    return { ...data, id, updatedAt: new Date() };
  }

  async deletePage(id: string, tenantId: string) {
    return { success: true, deletedId: id };
  }

  // ========== BLOGS ==========
  async getBlogs(tenantId: string) {
    try {
      const blogs = [
        { id: '1', title: 'Lojistik Sektöründeki Yeni Trendler', author: 'Admin', status: 'published', publishedAt: '2025-01-10' },
        { id: '2', title: 'Depolama Çözümleri', author: 'Admin', status: 'published', publishedAt: '2025-01-08' },
      ];
      return { data: blogs, total: blogs.length };
    } catch (error) {
      return { data: [], total: 0 };
    }
  }

  async createBlog(tenantId: string, data: any) {
    return { ...data, id: Date.now().toString(), tenantId, createdAt: new Date() };
  }

  // ========== BANNERS ==========
  async getBanners(tenantId: string) {
    try {
      const banners = [
        { id: '1', title: 'Ana Banner', image: '/banners/banner1.jpg', status: 'active', position: 'home' },
        { id: '2', title: 'Özel Kampanya', image: '/banners/banner2.jpg', status: 'active', position: 'campaign' },
      ];
      return { data: banners, total: banners.length };
    } catch (error) {
      return { data: [], total: 0 };
    }
  }

  async createBanner(tenantId: string, data: any) {
    return { ...data, id: Date.now().toString(), tenantId, createdAt: new Date() };
  }

  // ========== FAQ ==========
  async getFAQs(tenantId: string) {
    try {
      const faqs = [
        { id: '1', question: 'Teslimat süresi ne kadar?', answer: 'Ortalama 2-3 iş günü içinde teslim edilir.', category: 'delivery', order: 1 },
        { id: '2', question: 'Ücretsiz kargo var mı?', answer: '150 TL üzeri siparişlerde ücretsiz kargo.', category: 'shipping', order: 2 },
      ];
      return { data: faqs, total: faqs.length };
    } catch (error) {
      return { data: [], total: 0 };
    }
  }

  async createFAQ(tenantId: string, data: any) {
    return { ...data, id: Date.now().toString(), tenantId, createdAt: new Date() };
  }
}
