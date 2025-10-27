import * as LocalAuthentication from 'expo-local-authentication';

class BiometricService {
  async isAvailable(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  async getSupportedTypes(): Promise<number[]> {
    return await LocalAuthentication.supportedAuthenticationTypesAsync();
  }

  async authenticate(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: 'Authentication failed' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async authenticateForLogin(): Promise<boolean> {
    const available = await this.isAvailable();
    if (!available) return false;

    const result = await this.authenticate();
    return result.success;
  }

  getBiometricTypeName(type: number): string {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'Fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'Face ID';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris';
      default:
        return 'Biometric';
    }
  }
}

export default new BiometricService();


