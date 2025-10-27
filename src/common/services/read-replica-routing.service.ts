import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReadReplicaRoutingService {
  private readonly logger = new Logger('ReadReplicaRoutingService');
  private readonly replicas = [
    { name: 'replica-1', host: 'replica1.example.com', port: 5432, weight: 1 },
    { name: 'replica-2', host: 'replica2.example.com', port: 5432, weight: 1 },
    { name: 'replica-3', host: 'replica3.example.com', port: 5432, weight: 2 }
  ];

  getReadReplica(): string {
    const totalWeight = this.replicas.reduce((sum, replica) => sum + replica.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const replica of this.replicas) {
      random -= replica.weight;
      if (random <= 0) {
        this.logger.debug(`Selected read replica: ${replica.name}`);
        return `${replica.host}:${replica.port}`;
      }
    }
    
    return this.replicas[0].host + ':' + this.replicas[0].port;
  }

  getWriteConnection(): string {
    return 'primary.example.com:5432';
  }
}
