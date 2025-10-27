import { Injectable } from '@nestjs/common';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface SignatureRequest {
  id: string;
  documentId: string;
  signers: Array<{
    email: string;
    name: string;
    role: string;
    signed: boolean;
    signedAt?: Date;
  }>;
  status: 'pending' | 'partially_signed' | 'fully_signed' | 'declined';
  createdAt: Date;
  expiresAt: Date;
}

@Injectable()
export class ESignatureService {
  constructor(private readonly eventBus: EventBusService) {}

  async createSignatureRequest(
    documentId: string,
    signers: Array<{ email: string; name: string; role: string }>,
    expiryDays: number = 30
  ): Promise<SignatureRequest> {
    const request: SignatureRequest = {
      id: `SIG-${Date.now()}`,
      documentId,
      signers: signers.map(s => ({ ...s, signed: false })),
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    };

    for (const signer of signers) {
      await this.sendSignatureInvitation(signer.email, request.id);
    }

    await this.eventBus.publish('signature.request.created', {
      requestId: request.id,
      documentId,
      signerCount: signers.length,
    });

    return request;
  }

  private async sendSignatureInvitation(email: string, requestId: string): Promise<void> {
    console.log(`Sending signature invitation to ${email} for request ${requestId}`);
  }

  async signDocument(requestId: string, signerEmail: string, signatureData: string): Promise<SignatureRequest> {
    const request = await this.getSignatureRequest(requestId);
    
    const signer = request.signers.find(s => s.email === signerEmail);
    if (!signer) {
      throw new Error('Signer not found');
    }

    signer.signed = true;
    signer.signedAt = new Date();

    const allSigned = request.signers.every(s => s.signed);
    request.status = allSigned ? 'fully_signed' : 'partially_signed';

    await this.eventBus.publish('document.signed', {
      requestId,
      signerEmail,
      allSigned,
    });

    return request;
  }

  private async getSignatureRequest(id: string): Promise<SignatureRequest> {
    return {
      id,
      documentId: 'doc-1',
      signers: [
        { email: 'signer1@example.com', name: 'Signer 1', role: 'Customer', signed: false },
        { email: 'signer2@example.com', name: 'Signer 2', role: 'Supplier', signed: false },
      ],
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  async getSignatureStatus(requestId: string): Promise<any> {
    const request = await this.getSignatureRequest(requestId);
    
    return {
      requestId,
      status: request.status,
      progress: {
        signed: request.signers.filter(s => s.signed).length,
        total: request.signers.length,
        percentage: (request.signers.filter(s => s.signed).length / request.signers.length) * 100,
      },
      signers: request.signers,
    };
  }
}
