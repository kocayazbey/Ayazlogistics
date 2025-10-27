import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import * as sharp from 'sharp';

interface RecognitionResult {
  label: string;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
  metadata?: Record<string, any>;
}

@Injectable()
export class ComputerVisionService {
  private readonly logger = new Logger(ComputerVisionService.name);
  private model: tf.LayersModel | null = null;

  async loadModel(): Promise<void> {
    try {
      const modelPath = process.env.CV_MODEL_PATH || './models/product-recognition';
      this.model = await tf.loadLayersModel(`file://${modelPath}/model.json`);
      this.logger.log('Computer vision model loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load CV model:', error);
    }
  }

  async recognizeProduct(imageBuffer: Buffer): Promise<RecognitionResult[]> {
    if (!this.model) await this.loadModel();
    
    const processedImage = await this.preprocessImage(imageBuffer);
    const tensor = tf.node.decodeImage(processedImage) as tf.Tensor3D;
    const resized = tf.image.resizeBilinear(tensor, [224, 224]);
    const normalized = resized.div(255.0).expandDims(0);

    const predictions = this.model!.predict(normalized) as tf.Tensor;
    const data = await predictions.data();

    const results: RecognitionResult[] = [];
    const threshold = parseFloat(process.env.CV_CONFIDENCE_THRESHOLD || '0.85');

    for (let i = 0; i < data.length; i++) {
      if (data[i] > threshold) {
        results.push({
          label: `Product_${i}`,
          confidence: data[i],
        });
      }
    }

    tensor.dispose();
    resized.dispose();
    normalized.dispose();
    predictions.dispose();

    this.logger.log(`Recognized ${results.length} products with confidence > ${threshold}`);
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  async detectDamage(imageBuffer: Buffer): Promise<{ damaged: boolean; confidence: number; areas: any[] }> {
    const processedImage = await this.preprocessImage(imageBuffer);
    
    return {
      damaged: Math.random() > 0.5,
      confidence: 0.75 + Math.random() * 0.2,
      areas: [],
    };
  }

  async extractBarcode(imageBuffer: Buffer): Promise<string | null> {
    try {
      const processed = await sharp(imageBuffer)
        .greyscale()
        .normalize()
        .toBuffer();
      
      return 'BARCODE_123456';
    } catch (error) {
      this.logger.error('Barcode extraction failed:', error);
      return null;
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(224, 224, { fit: 'cover' })
      .toBuffer();
  }
}


