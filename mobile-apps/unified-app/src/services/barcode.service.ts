import { BarCodeScanner } from 'expo-barcode-scanner';
import { Camera } from 'expo-camera';

class BarcodeService {
  async requestPermissions(): Promise<boolean> {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    return status === 'granted';
  }

  async requestCameraPermissions(): Promise<boolean> {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  parseBarcode(data: string, type: string): { code: string; type: string } {
    return {
      code: data,
      type: type,
    };
  }

  validatePalletCode(code: string): boolean {
    return /^PLT-\d{4}-\d{3}$/.test(code);
  }

  validateLocationCode(code: string): boolean {
    return /^[A-Z]-\d{2}-\d{2}-\d{2}$/.test(code);
  }

  validatePurchaseOrder(code: string): boolean {
    return /^PO-\d{4}-\d{3}$/.test(code);
  }

  validateSKU(code: string): boolean {
    return /^SKU-\d{3}$/.test(code);
  }
}

export default new BarcodeService();

