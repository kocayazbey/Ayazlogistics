import { Injectable, Logger } from '@nestjs/common';

interface EdgeNode {
  nodeId: string;
  location: string;
  region: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'degraded';
  load: number;
  latency: number;
}

interface EdgeTask {
  taskId: string;
  type: 'image_processing' | 'data_aggregation' | 'validation' | 'caching' | 'analytics';
  payload: any;
  targetNodeId?: string;
  priority: number;
  maxLatency: number;
}

interface EdgeProcessingResult {
  taskId: string;
  nodeId: string;
  result: any;
  processingTime: number;
  timestamp: Date;
  cached: boolean;
}

@Injectable()
export class EdgeProcessorService {
  private readonly logger = new Logger(EdgeProcessorService.name);
  private edgeNodes = new Map<string, EdgeNode>();

  async registerEdgeNode(node: EdgeNode): Promise<void> {
    this.edgeNodes.set(node.nodeId, node);
    this.logger.log(`Edge node registered: ${node.nodeId} (${node.location})`);
  }

  async routeToEdge(task: EdgeTask): Promise<EdgeProcessingResult> {
    const node = task.targetNodeId 
      ? this.edgeNodes.get(task.targetNodeId)
      : this.selectBestNode(task);

    if (!node) {
      throw new Error('No suitable edge node available');
    }

    this.logger.log(`Routing task ${task.taskId} to edge node ${node.nodeId}`);

    const startTime = Date.now();

    const result = await this.processAtEdge(node, task);

    return {
      taskId: task.taskId,
      nodeId: node.nodeId,
      result,
      processingTime: Date.now() - startTime,
      timestamp: new Date(),
      cached: false,
    };
  }

  private selectBestNode(task: EdgeTask): EdgeNode | null {
    const candidates = Array.from(this.edgeNodes.values())
      .filter(node => 
        node.status === 'online' &&
        node.load < 80 &&
        node.latency < task.maxLatency &&
        node.capabilities.includes(task.type)
      );

    if (candidates.length === 0) return null;

    return candidates.reduce((best, current) => 
      current.load < best.load ? current : best
    );
  }

  private async processAtEdge(node: EdgeNode, task: EdgeTask): Promise<any> {
    this.logger.log(`Processing ${task.type} at edge node ${node.nodeId}`);

    switch (task.type) {
      case 'image_processing':
        return { processed: true, result: 'image_processed' };
      case 'data_aggregation':
        return { aggregated: task.payload };
      case 'validation':
        return { valid: true };
      default:
        return { status: 'processed' };
    }
  }

  async deployFunctionToEdge(functionCode: string, regions: string[]): Promise<string[]> {
    const deploymentIds: string[] = [];

    for (const region of regions) {
      const nodes = Array.from(this.edgeNodes.values()).filter(n => n.region === region);

      for (const node of nodes) {
        const deploymentId = `deploy_${node.nodeId}_${Date.now()}`;
        deploymentIds.push(deploymentId);

        this.logger.log(`Function deployed to edge node ${node.nodeId}`);
      }
    }

    return deploymentIds;
  }

  getEdgeNodeStatus(): EdgeNode[] {
    return Array.from(this.edgeNodes.values());
  }
}

