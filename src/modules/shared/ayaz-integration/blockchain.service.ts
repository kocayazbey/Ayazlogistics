import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { EventBusService } from '../../../core/events/event-bus.service';

interface BlockchainConfig {
  providerUrl: string;
  contractAddress: string;
  privateKey: string;
  network: 'mainnet' | 'testnet' | 'local';
}

interface SupplyChainEvent {
  id: string;
  shipmentId: string;
  eventType: 'created' | 'in_transit' | 'customs' | 'delivered' | 'exception';
  location: string;
  timestamp: Date;
  metadata: any;
}

interface BlockchainTransaction {
  hash: string;
  blockNumber: number;
  confirmations: number;
  gasUsed: string;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  // Simple Supply Chain Smart Contract ABI
  private readonly contractABI = [
    'function recordShipment(string shipmentId, string origin, string destination) public returns (bytes32)',
    'function updateShipmentStatus(bytes32 shipmentHash, string status, string location) public',
    'function getShipmentHistory(bytes32 shipmentHash) public view returns (tuple(string status, string location, uint256 timestamp)[])',
    'function verifyShipment(bytes32 shipmentHash) public view returns (bool)',
    'event ShipmentCreated(bytes32 indexed shipmentHash, string shipmentId, uint256 timestamp)',
    'event StatusUpdated(bytes32 indexed shipmentHash, string status, string location, uint256 timestamp)',
  ];

  async initialize(config: BlockchainConfig) {
    try {
      // Connect to blockchain network
      this.provider = new ethers.providers.JsonRpcProvider(config.providerUrl);

      // Create wallet
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);

      // Initialize contract
      this.contract = new ethers.Contract(
        config.contractAddress,
        this.contractABI,
        this.wallet,
      );

      // Test connection
      const network = await this.provider.getNetwork();
      this.logger.log(`Connected to blockchain network: ${network.name} (chainId: ${network.chainId})`);

      const balance = await this.wallet.getBalance();
      this.logger.log(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);

      return true;
    } catch (error) {
      this.logger.error('Blockchain initialization failed:', error);
      return false;
    }
  }

  // Record shipment on blockchain
  async recordShipment(shipmentId: string, origin: string, destination: string): Promise<BlockchainTransaction> {
    try {
      this.logger.log(`Recording shipment ${shipmentId} on blockchain...`);

      const tx = await this.contract.recordShipment(shipmentId, origin, destination);
      const receipt = await tx.wait();

      const result: BlockchainTransaction = {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        confirmations: receipt.confirmations,
        gasUsed: receipt.gasUsed.toString(),
      };

      await this.eventBus.emit('blockchain.shipment.recorded', {
        shipmentId,
        transactionHash: result.hash,
      });

      this.logger.log(`Shipment recorded: ${result.hash}`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to record shipment ${shipmentId}:`, error);
      throw error;
    }
  }

  // Update shipment status
  async updateShipmentStatus(
    shipmentHash: string,
    status: string,
    location: string,
  ): Promise<BlockchainTransaction> {
    try {
      this.logger.log(`Updating shipment ${shipmentHash} status to ${status}...`);

      const tx = await this.contract.updateShipmentStatus(shipmentHash, status, location);
      const receipt = await tx.wait();

      const result: BlockchainTransaction = {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        confirmations: receipt.confirmations,
        gasUsed: receipt.gasUsed.toString(),
      };

      await this.eventBus.emit('blockchain.status.updated', {
        shipmentHash,
        status,
        location,
        transactionHash: result.hash,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to update shipment ${shipmentHash}:`, error);
      throw error;
    }
  }

  // Get shipment history from blockchain
  async getShipmentHistory(shipmentHash: string): Promise<any[]> {
    try {
      const history = await this.contract.getShipmentHistory(shipmentHash);

      return history.map((event: any) => ({
        status: event.status,
        location: event.location,
        timestamp: new Date(event.timestamp.toNumber() * 1000),
      }));
    } catch (error) {
      this.logger.error(`Failed to get shipment history ${shipmentHash}:`, error);
      throw error;
    }
  }

  // Verify shipment authenticity
  async verifyShipment(shipmentHash: string): Promise<boolean> {
    try {
      const isValid = await this.contract.verifyShipment(shipmentHash);
      return isValid;
    } catch (error) {
      this.logger.error(`Failed to verify shipment ${shipmentHash}:`, error);
      return false;
    }
  }

  // Listen to blockchain events
  listenToEvents() {
    this.contract.on('ShipmentCreated', (shipmentHash, shipmentId, timestamp, event) => {
      this.logger.log(`Blockchain Event: Shipment created - ${shipmentId}`);
      this.eventBus.emit('blockchain.event.shipment.created', {
        shipmentHash,
        shipmentId,
        timestamp: new Date(timestamp.toNumber() * 1000),
        blockNumber: event.blockNumber,
      });
    });

    this.contract.on('StatusUpdated', (shipmentHash, status, location, timestamp, event) => {
      this.logger.log(`Blockchain Event: Status updated - ${status} at ${location}`);
      this.eventBus.emit('blockchain.event.status.updated', {
        shipmentHash,
        status,
        location,
        timestamp: new Date(timestamp.toNumber() * 1000),
        blockNumber: event.blockNumber,
      });
    });
  }

  // Calculate hash for shipment ID
  calculateShipmentHash(shipmentId: string): string {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(shipmentId));
  }

  // Get gas price estimate
  async estimateGasPrice(): Promise<string> {
    const gasPrice = await this.provider.getGasPrice();
    return ethers.utils.formatUnits(gasPrice, 'gwei');
  }

  // Get transaction cost estimate
  async estimateTransactionCost(functionName: string, args: any[]): Promise<string> {
    try {
      const gasEstimate = await this.contract.estimateGas[functionName](...args);
      const gasPrice = await this.provider.getGasPrice();
      const cost = gasEstimate.mul(gasPrice);
      return ethers.utils.formatEther(cost);
    } catch (error) {
      this.logger.error('Failed to estimate transaction cost:', error);
      return '0';
    }
  }
}

