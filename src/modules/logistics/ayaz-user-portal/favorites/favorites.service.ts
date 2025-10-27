import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface FavoriteRoute {
  id: string;
  userId: string;
  routeName: string;
  origin: string;
  destination: string;
  mode: string;
  serviceType: string;
  frequencyUsed: number;
  lastUsed: Date;
  estimatedCost?: number;
  estimatedTime?: number;
}

interface SavedSearch {
  id: string;
  userId: string;
  searchName: string;
  filters: Record<string, any>;
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
}

@Injectable()
export class FavoritesService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async saveFavoriteRoute(userId: string, route: Omit<FavoriteRoute, 'id' | 'frequencyUsed' | 'lastUsed'>): Promise<FavoriteRoute> {
    const favorite: FavoriteRoute = {
      ...route,
      id: `FAV-${Date.now()}`,
      userId,
      frequencyUsed: 0,
      lastUsed: new Date(),
    };

    await this.eventBus.publish('route.favorited', {
      userId,
      routeId: favorite.id,
    });

    return favorite;
  }

  async getFavoriteRoutes(userId: string): Promise<FavoriteRoute[]> {
    return [
      {
        id: 'fav-1',
        userId,
        routeName: 'Istanbul → Hamburg (Sea)',
        origin: 'Istanbul',
        destination: 'Hamburg',
        mode: 'sea',
        serviceType: 'fcl',
        frequencyUsed: 25,
        lastUsed: new Date(),
        estimatedCost: 15000,
        estimatedTime: 168,
      },
    ];
  }

  async saveSearch(userId: string, searchName: string, filters: Record<string, any>): Promise<SavedSearch> {
    const savedSearch: SavedSearch = {
      id: `SEARCH-${Date.now()}`,
      userId,
      searchName,
      filters,
      createdAt: new Date(),
      lastUsed: new Date(),
      usageCount: 0,
    };

    await this.eventBus.publish('search.saved', {
      userId,
      searchId: savedSearch.id,
    });

    return savedSearch;
  }

  async getSavedSearches(userId: string): Promise<SavedSearch[]> {
    return [
      {
        id: 'search-1',
        userId,
        searchName: 'Pending Invoices',
        filters: { status: 'pending', type: 'invoice' },
        createdAt: new Date(),
        lastUsed: new Date(),
        usageCount: 15,
      },
    ];
  }

  async useFavorite(favoriteId: string): Promise<void> {
    await this.eventBus.publish('favorite.used', {
      favoriteId,
      usedAt: new Date(),
    });
  }
}

