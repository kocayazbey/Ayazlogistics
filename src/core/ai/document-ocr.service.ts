import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as sharp from 'sharp';

interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
  }>;
}

interface DocumentData {
  documentType: string;
  extractedFields: Record<string, any>;
  confidence: number;
  rawText: string;
}

@Injectable()
export class DocumentOCRService {
  private readonly logger = new Logger(DocumentOCRService.name);
  private readonly apiKey: string;
  private readonly endpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('AZURE_VISION_API_KEY') || '';
    this.endpoint = this.configService.get<string>('AZURE_VISION_ENDPOINT') || '';
  }

  async extractTextFromImage(imageBuffer: Buffer): Promise<OCRResult> {
    try {
      // Preprocess image
      const processedImage = await sharp(imageBuffer)
        .resize(2000, null, { withoutEnlargement: true })
        .sharpen()
        .normalize()
        .toBuffer();

      const response = await axios.post(
        `${this.endpoint}/vision/v3.2/ocr`,
        processedImage,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.apiKey,
            'Content-Type': 'application/octet-stream',
          },
          params: {
            language: 'en',
            detectOrientation: true,
          },
        },
      );

      const regions = response.data?.regions || [];
      const words: OCRResult['words'] = [];
      const lines: OCRResult['lines'] = [];
      let fullText = '';

      for (const region of regions) {
        for (const line of region.lines || []) {
          const lineText = line.words?.map((w: any) => w.text).join(' ') || '';
          lines.push({
            text: lineText,
            confidence: 0.9, // Mock confidence
          });

          for (const word of line.words || []) {
            words.push({
              text: word.text,
              confidence: 0.9,
              boundingBox: {
                x: parseInt(word.boundingBox?.split(',')[0] || '0'),
                y: parseInt(word.boundingBox?.split(',')[1] || '0'),
                width: parseInt(word.boundingBox?.split(',')[2] || '0'),
                height: parseInt(word.boundingBox?.split(',')[3] || '0'),
              },
            });
          }

          fullText += lineText + '\n';
        }
      }

      return {
        text: fullText.trim(),
        confidence: 0.9,
        words,
        lines,
      };
    } catch (error: any) {
      this.logger.error(`OCR extraction failed: ${error.message}`, error.stack);
      return {
        text: '',
        confidence: 0,
        words: [],
        lines: [],
      };
    }
  }

  async extractInvoiceData(imageBuffer: Buffer): Promise<DocumentData> {
    const ocrResult = await this.extractTextFromImage(imageBuffer);
    const text = ocrResult.text;

    // Extract common invoice fields using patterns
    const extractedFields: Record<string, any> = {};

    // Invoice number
    const invoiceNoMatch = text.match(/invoice\s*(?:no|number|#)?\s*:?\s*([A-Z0-9-]+)/i);
    if (invoiceNoMatch) {
      extractedFields.invoiceNumber = invoiceNoMatch[1];
    }

    // Date
    const dateMatch = text.match(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/);
    if (dateMatch) {
      extractedFields.invoiceDate = dateMatch[0];
    }

    // Total amount
    const totalMatch = text.match(/total\s*:?\s*([0-9,.]+)/i);
    if (totalMatch) {
      extractedFields.totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
    }

    // Tax/VAT
    const vatMatch = text.match(/(?:vat|tax|kdv)\s*:?\s*([0-9,.]+)/i);
    if (vatMatch) {
      extractedFields.taxAmount = parseFloat(vatMatch[1].replace(/,/g, ''));
    }

    return {
      documentType: 'invoice',
      extractedFields,
      confidence: ocrResult.confidence,
      rawText: text,
    };
  }

  async extractCMRData(imageBuffer: Buffer): Promise<DocumentData> {
    const ocrResult = await this.extractTextFromImage(imageBuffer);
    const text = ocrResult.text;

    const extractedFields: Record<string, any> = {};

    // CMR number
    const cmrMatch = text.match(/cmr\s*(?:no|number)?\s*:?\s*([A-Z0-9-]+)/i);
    if (cmrMatch) {
      extractedFields.cmrNumber = cmrMatch[1];
    }

    // Sender
    const senderMatch = text.match(/sender\s*:?\s*([^\n]+)/i);
    if (senderMatch) {
      extractedFields.sender = senderMatch[1].trim();
    }

    // Consignee
    const consigneeMatch = text.match(/consignee\s*:?\s*([^\n]+)/i);
    if (consigneeMatch) {
      extractedFields.consignee = consigneeMatch[1].trim();
    }

    // Weight
    const weightMatch = text.match(/(?:gross\s*)?weight\s*:?\s*([0-9,.]+)\s*(?:kg|kgs)?/i);
    if (weightMatch) {
      extractedFields.weight = parseFloat(weightMatch[1].replace(/,/g, ''));
    }

    return {
      documentType: 'cmr',
      extractedFields,
      confidence: ocrResult.confidence,
      rawText: text,
    };
  }

  async extractBillOfLadingData(imageBuffer: Buffer): Promise<DocumentData> {
    const ocrResult = await this.extractTextFromImage(imageBuffer);
    const text = ocrResult.text;

    const extractedFields: Record<string, any> = {};

    // B/L number
    const blMatch = text.match(/(?:b\/l|bill\s*of\s*lading)\s*(?:no|number)?\s*:?\s*([A-Z0-9-]+)/i);
    if (blMatch) {
      extractedFields.blNumber = blMatch[1];
    }

    // Vessel
    const vesselMatch = text.match(/vessel\s*:?\s*([^\n]+)/i);
    if (vesselMatch) {
      extractedFields.vessel = vesselMatch[1].trim();
    }

    // Port of loading
    const polMatch = text.match(/port\s*of\s*loading\s*:?\s*([^\n]+)/i);
    if (polMatch) {
      extractedFields.portOfLoading = polMatch[1].trim();
    }

    // Port of discharge
    const podMatch = text.match(/port\s*of\s*discharge\s*:?\s*([^\n]+)/i);
    if (podMatch) {
      extractedFields.portOfDischarge = podMatch[1].trim();
    }

    return {
      documentType: 'bill_of_lading',
      extractedFields,
      confidence: ocrResult.confidence,
      rawText: text,
    };
  }

  async extractPOData(imageBuffer: Buffer): Promise<DocumentData> {
    const ocrResult = await this.extractTextFromImage(imageBuffer);
    const text = ocrResult.text;

    const extractedFields: Record<string, any> = {};

    // PO number
    const poMatch = text.match(/(?:po|purchase\s*order)\s*(?:no|number)?\s*:?\s*([A-Z0-9-]+)/i);
    if (poMatch) {
      extractedFields.poNumber = poMatch[1];
    }

    // Supplier
    const supplierMatch = text.match(/(?:supplier|vendor)\s*:?\s*([^\n]+)/i);
    if (supplierMatch) {
      extractedFields.supplier = supplierMatch[1].trim();
    }

    return {
      documentType: 'purchase_order',
      extractedFields,
      confidence: ocrResult.confidence,
      rawText: text,
    };
  }

  async classifyDocument(imageBuffer: Buffer): Promise<string> {
    const ocrResult = await this.extractTextFromImage(imageBuffer);
    const text = ocrResult.text.toLowerCase();

    if (text.includes('invoice') || text.includes('fatura')) {
      return 'invoice';
    } else if (text.includes('cmr')) {
      return 'cmr';
    } else if (text.includes('bill of lading') || text.includes('b/l')) {
      return 'bill_of_lading';
    } else if (text.includes('purchase order') || text.includes('po')) {
      return 'purchase_order';
    } else if (text.includes('packing list')) {
      return 'packing_list';
    } else if (text.includes('delivery note') || text.includes('irsaliye')) {
      return 'delivery_note';
    }

    return 'unknown';
  }
}


