import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as crypto from 'crypto';
import { ethers } from 'ethers';

interface DocumentHash {
  documentId: string;
  hash: string;
  algorithm: 'sha256' | 'sha512';
  createdAt: Date;
  createdBy: string;
}

interface BlockchainRecord {
  documentId: string;
  hash: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: Date;
  verified: boolean;
  verificationUrl: string;
}

interface VerificationResult {
  documentId: string;
  isValid: boolean;
  onChain: boolean;
  tamperedWith: boolean;
  originalHash: string;
  currentHash: string;
  blockchainRecord?: BlockchainRecord;
  verifiedAt: Date;
}

interface CertificateRecord {
  certificateId: string;
  type: 'business_license' | 'iso_certificate' | 'tax_certificate' | 'customs_certificate' | 'health_permit';
  issuer: string;
  issuedTo: string;
  issuedAt: Date;
  expiresAt: Date;
  hash: string;
  blockchainTxHash: string;
  status: 'valid' | 'expired' | 'revoked';
}

@Injectable()
export class DocumentVerificationService {
  private readonly logger = new Logger(DocumentVerificationService.name);
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {
    if (process.env.BLOCKCHAIN_ENABLED === 'true') {
      this.initializeBlockchain();
    }
  }

  private initializeBlockchain(): void {
    this.provider = new ethers.providers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
    this.wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY || '', this.provider);

    const abi = [
      'function registerDocument(string documentId, string hash, uint256 timestamp) public returns (bool)',
      'function verifyDocument(string documentId) public view returns (string hash, uint256 timestamp, bool exists)',
      'function revokeDocument(string documentId, string reason) public returns (bool)',
      'event DocumentRegistered(string documentId, string hash, uint256 timestamp)',
      'event DocumentRevoked(string documentId, string reason, uint256 timestamp)',
    ];

    this.contract = new ethers.Contract(
      process.env.BLOCKCHAIN_DOC_CONTRACT_ADDRESS || '',
      abi,
      this.wallet
    );

    this.logger.log('Document verification blockchain initialized');
  }

  async hashDocument(documentId: string, documentContent: Buffer): Promise<DocumentHash> {
    const hash = crypto.createHash('sha256').update(documentContent).digest('hex');

    const documentHash: DocumentHash = {
      documentId,
      hash,
      algorithm: 'sha256',
      createdAt: new Date(),
      createdBy: 'system',
    };

    await this.db.execute(
      `INSERT INTO document_hashes (document_id, hash, algorithm, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (document_id) DO NOTHING`,
      [documentHash.documentId, documentHash.hash, documentHash.algorithm, documentHash.createdAt, documentHash.createdBy]
    );

    this.logger.log(`Document hashed: ${documentId} - ${hash.substring(0, 16)}...`);

    return documentHash;
  }

  async registerOnBlockchain(documentId: string, hash: string): Promise<BlockchainRecord> {
    if (!this.contract) {
      throw new Error('Blockchain not initialized');
    }

    this.logger.log(`Registering document on blockchain: ${documentId}`);

    try {
      const tx = await this.contract.registerDocument(
        documentId,
        hash,
        Math.floor(Date.now() / 1000)
      );

      const receipt = await tx.wait();

      const blockchainRecord: BlockchainRecord = {
        documentId,
        hash,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        timestamp: new Date(),
        verified: true,
        verificationUrl: `${process.env.BLOCKCHAIN_EXPLORER_URL}/tx/${receipt.transactionHash}`,
      };

      await this.db.execute(
        `INSERT INTO blockchain_document_records 
         (document_id, hash, transaction_hash, block_number, timestamp, verified)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [documentId, hash, receipt.transactionHash, receipt.blockNumber, blockchainRecord.timestamp]
      );

      this.logger.log(`Document registered on blockchain: tx ${receipt.transactionHash}`);

      return blockchainRecord;
    } catch (error) {
      this.logger.error('Blockchain registration failed:', error);
      throw error;
    }
  }

  async verifyDocument(documentId: string, currentContent: Buffer): Promise<VerificationResult> {
    this.logger.log(`Verifying document: ${documentId}`);

    const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');

    const hashRecord = await this.db.execute(
      `SELECT * FROM document_hashes WHERE document_id = $1`,
      [documentId]
    );

    if (hashRecord.rows.length === 0) {
      return {
        documentId,
        isValid: false,
        onChain: false,
        tamperedWith: false,
        originalHash: '',
        currentHash,
        verifiedAt: new Date(),
      };
    }

    const originalHash = hashRecord.rows[0].hash;
    const tamperedWith = currentHash !== originalHash;

    let blockchainRecord: BlockchainRecord | undefined;
    let onChain = false;

    if (this.contract) {
      try {
        const result = await this.contract.verifyDocument(documentId);
        onChain = result.exists;

        if (onChain) {
          const bcRecord = await this.db.execute(
            `SELECT * FROM blockchain_document_records WHERE document_id = $1`,
            [documentId]
          );

          if (bcRecord.rows.length > 0) {
            blockchainRecord = {
              documentId,
              hash: bcRecord.rows[0].hash,
              transactionHash: bcRecord.rows[0].transaction_hash,
              blockNumber: bcRecord.rows[0].block_number,
              timestamp: new Date(bcRecord.rows[0].timestamp),
              verified: bcRecord.rows[0].verified,
              verificationUrl: `${process.env.BLOCKCHAIN_EXPLORER_URL}/tx/${bcRecord.rows[0].transaction_hash}`,
            };
          }
        }
      } catch (error) {
        this.logger.error('Blockchain verification failed:', error);
      }
    }

    const verificationResult: VerificationResult = {
      documentId,
      isValid: !tamperedWith && (onChain ? blockchainRecord?.hash === originalHash : true),
      onChain,
      tamperedWith,
      originalHash,
      currentHash,
      blockchainRecord,
      verifiedAt: new Date(),
    };

    await this.db.execute(
      `INSERT INTO document_verifications 
       (document_id, is_valid, on_chain, tampered_with, verified_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [documentId, verificationResult.isValid, onChain, tamperedWith, verificationResult.verifiedAt]
    );

    if (tamperedWith) {
      this.logger.error(`DOCUMENT TAMPERING DETECTED: ${documentId}`);
    }

    return verificationResult;
  }

  async registerCertificate(certificate: Omit<CertificateRecord, 'blockchainTxHash' | 'status'>): Promise<CertificateRecord> {
    this.logger.log(`Registering certificate: ${certificate.certificateId}`);

    const record = await this.registerOnBlockchain(certificate.certificateId, certificate.hash);

    const certRecord: CertificateRecord = {
      ...certificate,
      blockchainTxHash: record.transactionHash,
      status: certificate.expiresAt > new Date() ? 'valid' : 'expired',
    };

    await this.db.execute(
      `INSERT INTO certificate_records 
       (certificate_id, type, issuer, issued_to, issued_at, expires_at, hash, blockchain_tx_hash, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        certRecord.certificateId,
        certRecord.type,
        certRecord.issuer,
        certRecord.issuedTo,
        certRecord.issuedAt,
        certRecord.expiresAt,
        certRecord.hash,
        certRecord.blockchainTxHash,
        certRecord.status,
      ]
    );

    return certRecord;
  }

  async verifyCertificate(certificateId: string): Promise<{ valid: boolean; expired: boolean; revoked: boolean; onChain: boolean }> {
    const result = await this.db.execute(
      `SELECT * FROM certificate_records WHERE certificate_id = $1`,
      [certificateId]
    );

    if (result.rows.length === 0) {
      return { valid: false, expired: false, revoked: false, onChain: false };
    }

    const cert = result.rows[0];
    const expired = new Date(cert.expires_at) < new Date();
    const revoked = cert.status === 'revoked';

    let onChain = false;
    if (this.contract) {
      try {
        const blockchainData = await this.contract.verifyDocument(certificateId);
        onChain = blockchainData.exists;
      } catch (error) {
        this.logger.error('Blockchain certificate verification failed:', error);
      }
    }

    return {
      valid: !expired && !revoked && onChain,
      expired,
      revoked,
      onChain,
    };
  }

  async revokeCertificate(certificateId: string, reason: string): Promise<void> {
    await this.db.execute(
      `UPDATE certificate_records SET status = 'revoked', revoked_at = NOW(), revoke_reason = $2 WHERE certificate_id = $1`,
      [certificateId, reason]
    );

    if (this.contract) {
      try {
        const tx = await this.contract.revokeDocument(certificateId, reason);
        await tx.wait();
        this.logger.log(`Certificate revoked on blockchain: ${certificateId}`);
      } catch (error) {
        this.logger.error('Blockchain revocation failed:', error);
      }
    }

    this.logger.warn(`Certificate revoked: ${certificateId} - ${reason}`);
  }

  async batchVerifyDocuments(documentIds: string[]): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];

    for (const documentId of documentIds) {
      try {
        const content = Buffer.from('');
        const result = await this.verifyDocument(documentId, content);
        results.push(result);
      } catch (error) {
        this.logger.error(`Batch verification failed for ${documentId}:`, error);
      }
    }

    return results;
  }
}

