import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

interface ContractAgreement {
  id: string;
  parties: string[];
  terms: {
    service: string;
    duration: number;
    price: number;
    currency: string;
    paymentSchedule: string;
    deliveryTerms: string;
    penalties: Record<string, number>;
  };
  conditions: Array<{
    type: 'price' | 'delivery' | 'quality' | 'payment';
    condition: string;
    action: string;
  }>;
  autoExecute: boolean;
}

interface ContractExecution {
  contractId: string;
  event: string;
  timestamp: Date;
  result: 'success' | 'failed' | 'pending';
  txHash?: string;
  blockNumber?: number;
  gasUsed?: number;
}

@Injectable()
export class SmartContractService {
  private readonly logger = new Logger(SmartContractService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contractFactory: ethers.ContractFactory;

  constructor() {
    if (process.env.BLOCKCHAIN_ENABLED === 'true') {
      this.initializeBlockchain();
    }
  }

  private initializeBlockchain(): void {
    try {
      this.provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
      this.wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY || '', this.provider);

      const contractABI = [
        'function createAgreement(string agreementId, address[] parties, uint256 price, uint256 duration) public returns (uint256)',
        'function executeCondition(string agreementId, string condition) public returns (bool)',
        'function getAgreementStatus(string agreementId) public view returns (string)',
        'function terminateAgreement(string agreementId, string reason) public',
        'function triggerPayment(string agreementId, uint256 amount) public',
        'function recordDelivery(string agreementId, uint256 timestamp, string location) public',
        'function calculatePenalty(string agreementId) public view returns (uint256)',
        'event AgreementCreated(string agreementId, address[] parties, uint256 price)',
        'event ConditionExecuted(string agreementId, string condition, bool success)',
        'event PaymentTriggered(string agreementId, uint256 amount, address recipient)',
        'event PenaltyApplied(string agreementId, uint256 amount, string reason)',
      ];

      const bytecode = process.env.SMART_CONTRACT_BYTECODE || '';

      this.contractFactory = new ethers.ContractFactory(contractABI, bytecode, this.wallet);

      this.logger.log('Smart contract service initialized');
    } catch (error) {
      this.logger.error('Smart contract initialization failed:', error);
    }
  }

  async deployContract(agreement: ContractAgreement): Promise<{ address: string; txHash: string }> {
    if (!this.contractFactory) {
      throw new Error('Smart contract service not initialized');
    }

    try {
      this.logger.log(`Deploying smart contract for agreement ${agreement.id}`);

      const contract = await this.contractFactory.deploy();
      await contract.deployed();

      const tx = await contract.createAgreement(
        agreement.id,
        agreement.parties,
        ethers.utils.parseEther(agreement.terms.price.toString()),
        agreement.terms.duration
      );

      const receipt = await tx.wait();

      this.logger.log(`Smart contract deployed at ${contract.address}`);

      return {
        address: contract.address,
        txHash: receipt.transactionHash,
      };
    } catch (error) {
      this.logger.error('Contract deployment failed:', error);
      throw error;
    }
  }

  async executeCondition(
    contractAddress: string,
    agreementId: string,
    condition: string,
  ): Promise<ContractExecution> {
    const contract = new ethers.Contract(
      contractAddress,
      this.contractFactory.interface,
      this.wallet
    );

    try {
      this.logger.log(`Executing condition: ${condition} for agreement ${agreementId}`);

      const tx = await contract.executeCondition(agreementId, condition);
      const receipt = await tx.wait();

      const event = receipt.events?.find((e: any) => e.event === 'ConditionExecuted');
      const success = event?.args?.success || false;

      return {
        contractId: agreementId,
        event: condition,
        timestamp: new Date(),
        result: success ? 'success' : 'failed',
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toNumber(),
      };
    } catch (error) {
      this.logger.error('Condition execution failed:', error);
      return {
        contractId: agreementId,
        event: condition,
        timestamp: new Date(),
        result: 'failed',
      };
    }
  }

  async triggerAutomaticPayment(
    contractAddress: string,
    agreementId: string,
    amount: number,
  ): Promise<void> {
    const contract = new ethers.Contract(
      contractAddress,
      this.contractFactory.interface,
      this.wallet
    );

    try {
      const tx = await contract.triggerPayment(agreementId, ethers.utils.parseEther(amount.toString()));
      const receipt = await tx.wait();

      this.logger.log(`Automatic payment triggered: ${amount} ETH (tx: ${receipt.transactionHash})`);
    } catch (error) {
      this.logger.error('Automatic payment failed:', error);
      throw error;
    }
  }

  async recordDeliveryOnChain(
    contractAddress: string,
    agreementId: string,
    deliveryProof: { timestamp: Date; location: string; signature: string },
  ): Promise<void> {
    const contract = new ethers.Contract(
      contractAddress,
      this.contractFactory.interface,
      this.wallet
    );

    try {
      const tx = await contract.recordDelivery(
        agreementId,
        Math.floor(deliveryProof.timestamp.getTime() / 1000),
        deliveryProof.location
      );

      await tx.wait();

      this.logger.log(`Delivery recorded on blockchain for agreement ${agreementId}`);
    } catch (error) {
      this.logger.error('Delivery recording failed:', error);
      throw error;
    }
  }

  async calculateAndApplyPenalty(
    contractAddress: string,
    agreementId: string,
    reason: string,
  ): Promise<number> {
    const contract = new ethers.Contract(
      contractAddress,
      this.contractFactory.interface,
      this.wallet
    );

    try {
      const penalty = await contract.calculatePenalty(agreementId);
      const penaltyAmount = parseFloat(ethers.utils.formatEther(penalty));

      this.logger.log(`Penalty calculated for ${agreementId}: ${penaltyAmount} ETH (${reason})`);

      return penaltyAmount;
    } catch (error) {
      this.logger.error('Penalty calculation failed:', error);
      return 0;
    }
  }

  async getContractStatus(contractAddress: string, agreementId: string): Promise<string> {
    const contract = new ethers.Contract(
      contractAddress,
      this.contractFactory.interface,
      this.wallet
    );

    try {
      const status = await contract.getAgreementStatus(agreementId);
      return status;
    } catch (error) {
      this.logger.error('Status check failed:', error);
      return 'unknown';
    }
  }

  async terminateContract(
    contractAddress: string,
    agreementId: string,
    reason: string,
  ): Promise<void> {
    const contract = new ethers.Contract(
      contractAddress,
      this.contractFactory.interface,
      this.wallet
    );

    try {
      const tx = await contract.terminateAgreement(agreementId, reason);
      await tx.wait();

      this.logger.log(`Contract terminated: ${agreementId} (${reason})`);
    } catch (error) {
      this.logger.error('Contract termination failed:', error);
      throw error;
    }
  }

  async monitorContractEvents(contractAddress: string): Promise<void> {
    const contract = new ethers.Contract(
      contractAddress,
      this.contractFactory.interface,
      this.wallet
    );

    contract.on('PaymentTriggered', (agreementId, amount, recipient) => {
      this.logger.log(`Payment event: ${agreementId} - ${ethers.utils.formatEther(amount)} ETH to ${recipient}`);
    });

    contract.on('PenaltyApplied', (agreementId, amount, reason) => {
      this.logger.warn(`Penalty event: ${agreementId} - ${ethers.utils.formatEther(amount)} ETH (${reason})`);
    });

    contract.on('ConditionExecuted', (agreementId, condition, success) => {
      this.logger.log(`Condition event: ${agreementId} - ${condition} = ${success}`);
    });

    this.logger.log(`Monitoring events for contract ${contractAddress}`);
  }

  async getTransactionHistory(contractAddress: string): Promise<any[]> {
    const contract = new ethers.Contract(
      contractAddress,
      this.contractFactory.interface,
      this.provider
    );

    const filter = contract.filters.AgreementCreated();
    const events = await contract.queryFilter(filter, -10000);

    return events.map(event => ({
      event: event.event,
      args: event.args,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
    }));
  }
}

