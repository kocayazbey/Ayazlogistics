import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Elasticsearch Service
 * Full-text search, fuzzy search, autocomplete, suggestions
 */

export interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  fuzzy?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T = any> {
  hits: Array<{
    id: string;
    score: number;
    source: T;
    highlight?: Record<string, string[]>;
  }>;
  total: number;
  page: number;
  pageSize: number;
  took: number; // ms
  suggestions?: string[];
}

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private client: Client;
  private readonly indexPrefix = 'ayazlogistics';

  constructor(private eventEmitter: EventEmitter2) {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
      },
    });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      console.log('✅ Elasticsearch connected');
      await this.createIndices();
    } catch (error) {
      console.warn('⚠️ Elasticsearch not available:', error.message);
    }
  }

  /**
   * Create indices for all searchable entities
   */
  private async createIndices(): Promise<void> {
    const indices = [
      {
        name: `${this.indexPrefix}-products`,
        mappings: {
          properties: {
            skuCode: { type: 'keyword' },
            description: { type: 'text', analyzer: 'standard' },
            descriptionTr: { type: 'text', analyzer: 'turkish' },
            category: { type: 'keyword' },
            brand: { type: 'keyword' },
            weight: { type: 'float' },
            dimensions: { type: 'object' },
            createdAt: { type: 'date' },
          },
        },
      },
      {
        name: `${this.indexPrefix}-customers`,
        mappings: {
          properties: {
            code: { type: 'keyword' },
            name: { type: 'text', analyzer: 'standard' },
            email: { type: 'keyword' },
            phone: { type: 'keyword' },
            address: { type: 'text' },
            city: { type: 'keyword' },
            country: { type: 'keyword' },
            type: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      },
      {
        name: `${this.indexPrefix}-orders`,
        mappings: {
          properties: {
            orderNumber: { type: 'keyword' },
            customerId: { type: 'keyword' },
            customerName: { type: 'text' },
            status: { type: 'keyword' },
            totalAmount: { type: 'float' },
            orderDate: { type: 'date' },
            dueDate: { type: 'date' },
            items: { type: 'nested' },
          },
        },
      },
      {
        name: `${this.indexPrefix}-pallets`,
        mappings: {
          properties: {
            palletNumber: { type: 'keyword' },
            skuCode: { type: 'keyword' },
            lotNumber: { type: 'keyword' },
            locationCode: { type: 'keyword' },
            quantity: { type: 'integer' },
            status: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      },
      {
        name: `${this.indexPrefix}-locations`,
        mappings: {
          properties: {
            code: { type: 'keyword' },
            zone: { type: 'keyword' },
            aisle: { type: 'keyword' },
            level: { type: 'keyword' },
            position: { type: 'keyword' },
            type: { type: 'keyword' },
            capacity: { type: 'integer' },
            available: { type: 'integer' },
          },
        },
      },
    ];

    for (const index of indices) {
      try {
        const exists = await this.client.indices.exists({ index: index.name });
        if (!exists) {
          await this.client.indices.create({
            index: index.name,
            body: {
              mappings: index.mappings,
              settings: {
                number_of_shards: 1,
                number_of_replicas: 1,
                analysis: {
                  analyzer: {
                    turkish: {
                      type: 'standard',
                      stopwords: '_turkish_',
                    },
                  },
                },
              },
            },
          });
          console.log(`✅ Created index: ${index.name}`);
        }
      } catch (error) {
        console.error(`Error creating index ${index.name}:`, error.message);
      }
    }
  }

  /**
   * Index a document
   */
  async indexDocument(index: string, id: string, document: any): Promise<void> {
    try {
      await this.client.index({
        index: `${this.indexPrefix}-${index}`,
        id,
        document,
        refresh: true,
      });

      await this.eventEmitter.emitAsync('elasticsearch.document.indexed', {
        index,
        id,
      });
    } catch (error) {
      console.error(`Error indexing document:`, error);
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(index: string, documents: Array<{ id: string; data: any }>): Promise<void> {
    try {
      const operations = documents.flatMap((doc) => [
        { index: { _index: `${this.indexPrefix}-${index}`, _id: doc.id } },
        doc.data,
      ]);

      await this.client.bulk({
        operations,
        refresh: true,
      });

      await this.eventEmitter.emitAsync('elasticsearch.bulk.indexed', {
        index,
        count: documents.length,
      });
    } catch (error) {
      console.error(`Error bulk indexing:`, error);
    }
  }

  /**
   * Full-text search with fuzzy matching
   */
  async search<T = any>(index: string, query: SearchQuery): Promise<SearchResult<T>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const from = (page - 1) * pageSize;

    const searchQuery: any = {
      bool: {
        must: [],
        filter: [],
      },
    };

    // Main query
    if (query.query) {
      if (query.fuzzy) {
        searchQuery.bool.must.push({
          multi_match: {
            query: query.query,
            fields: ['*'],
            fuzziness: 'AUTO',
            prefix_length: 2,
          },
        });
      } else {
        searchQuery.bool.must.push({
          multi_match: {
            query: query.query,
            fields: ['*'],
            type: 'best_fields',
          },
        });
      }
    }

    // Filters
    if (query.filters) {
      Object.entries(query.filters).forEach(([field, value]) => {
        if (Array.isArray(value)) {
          searchQuery.bool.filter.push({ terms: { [field]: value } });
        } else {
          searchQuery.bool.filter.push({ term: { [field]: value } });
        }
      });
    }

    try {
      const result = await this.client.search({
        index: `${this.indexPrefix}-${index}`,
        from,
        size: pageSize,
        query: searchQuery,
        highlight: {
          fields: {
            '*': {},
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        },
        sort: query.sortBy
          ? [{ [query.sortBy]: { order: query.sortOrder || 'desc' } }]
          : undefined,
      });

      return {
        hits: result.hits.hits.map((hit: any) => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlight: hit.highlight,
        })),
        total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total.value,
        page,
        pageSize,
        took: result.took,
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      return {
        hits: [],
        total: 0,
        page,
        pageSize,
        took: 0,
      };
    }
  }

  /**
   * Autocomplete suggestions
   */
  async suggest(index: string, field: string, prefix: string, size: number = 10): Promise<string[]> {
    try {
      const result = await this.client.search({
        index: `${this.indexPrefix}-${index}`,
        size,
        query: {
          prefix: {
            [field]: {
              value: prefix,
              case_insensitive: true,
            },
          },
        },
        _source: [field],
      });

      return result.hits.hits.map((hit: any) => hit._source[field]).filter((v, i, a) => a.indexOf(v) === i);
    } catch (error) {
      console.error('Elasticsearch suggest error:', error);
      return [];
    }
  }

  /**
   * Fuzzy search for typo tolerance
   */
  async fuzzySearch<T = any>(index: string, query: string, fields: string[] = ['*']): Promise<SearchResult<T>> {
    return this.search<T>(index, {
      query,
      fuzzy: true,
      page: 1,
      pageSize: 20,
    });
  }

  /**
   * Delete document
   */
  async deleteDocument(index: string, id: string): Promise<void> {
    try {
      await this.client.delete({
        index: `${this.indexPrefix}-${index}`,
        id,
        refresh: true,
      });
    } catch (error) {
      console.error(`Error deleting document:`, error);
    }
  }

  /**
   * Update document
   */
  async updateDocument(index: string, id: string, updates: any): Promise<void> {
    try {
      await this.client.update({
        index: `${this.indexPrefix}-${index}`,
        id,
        doc: updates,
        refresh: true,
      });
    } catch (error) {
      console.error(`Error updating document:`, error);
    }
  }

  /**
   * Get document by ID
   */
  async getDocument<T = any>(index: string, id: string): Promise<T | null> {
    try {
      const result = await this.client.get({
        index: `${this.indexPrefix}-${index}`,
        id,
      });
      return result._source as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Aggregation query
   */
  async aggregate(index: string, aggregations: any): Promise<any> {
    try {
      const result = await this.client.search({
        index: `${this.indexPrefix}-${index}`,
        size: 0,
        aggs: aggregations,
      });
      return result.aggregations;
    } catch (error) {
      console.error('Elasticsearch aggregation error:', error);
      return {};
    }
  }
}

