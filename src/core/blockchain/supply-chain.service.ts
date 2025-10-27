import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

interface BlockchainTransaction {
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  from: string;
  to: string;
  data: any;
}

interface SupplyChainEvent {
  eventType: 'created' | 'shipped' | 'received' | 'quality_check' | 'delivered';
  shipmentId: string;
  location: string;
  timestamp: Date;
  actor: string;
  metadata: Record<string, any>;
}

@Injectable()
export class BlockchainSupplyChainService {
  private readonly logger = new Logger(BlockchainSupplyChainService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    if (process.env.BLOCKCHAIN_ENABLED === 'true') {
      this.initializeBlockchain();
    }
  }

  private initializeBlockchain(): void {
    try {
      this.provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
      this.wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY || '', this.provider);
      
      const abi = [
        'function recordEvent(string shipmentId, string eventType, string location, string metadata) public returns (uint256)',
        'function getEvents(string shipmentId) public view returns (tuple(string eventType, string location, uint256 timestamp, string actor, string metadata)[])',
        'function verifyAuthenticity(string shipmentId) public view returns (bool)',
      ];

      this.contract = new ethers.Contract(
        process.env.BLOCKCHAIN_CONTRACT_ADDRESS || '',
        abi,
        this.wallet
      );

      this.logger.log('Blockchain initialized successfully');
    } catch (error) {
      this.logger.error('Blockchain initialization failed:', error);
    }
  }

  async recordSupplyChainEvent(event: SupplyChainEvent): Promise<BlockchainTransaction> {
    if (!this.contract) {
      throw new Error('Blockchain not initialized');
    }

    try {
      const tx = await this.contract.recordEvent(
        event.shipmentId,
        event.eventType,
        event.location,
        JSON.stringify(event.metadata)
      );

      const receipt = await tx.wait();

      this.logger.log(`Supply chain event recorded on blockchain: ${receipt.transactionHash}`);

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date(),
        from: this.wallet.address,
        to: this.contract.address,
        data: event,
      };
    } catch (error) {
      this.logger.error('Failed to record event on blockchain:', error);
      throw error;
    }
  }

  async getShipmentHistory(shipmentId: string): Promise<SupplyChainEvent[]> {
    if (!this.contract) {
      throw new Error('Blockchain not initialized');
    }

    try {
      const events = await this.contract.getEvents(shipmentId);
      
      return events.map((e: any) => ({
        eventType: e.eventType,
        shipmentId,
        location: e.location,
        timestamp: new Date(e.timestamp * 1000),
        actor: e.actor,
        metadata: JSON.parse(e.metadata),
      }));
    } catch (error) {
      this.logger.error(`Failed to get shipment history for ${shipmentId}:`, error);
      return [];
    }
  }

  async verifyAuthenticity(shipmentId: string): Promise<boolean> {
    if (!this.contract) return false;

    try {
      const isAuthentic = await this.contract.verifyAuthenticity(shipmentId);
      return isAuthentic;
    } catch (error) {
      this.logger.error(`Authenticity verification failed for ${shipmentId}:`, error);
      return false;
    }
  }
}

