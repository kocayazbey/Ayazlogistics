import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { Push } from '@ionic-native/push/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private isInitialized = false;

  constructor(
    private platform: Platform,
    private localNotifications: LocalNotifications,
    private push: Push,
    private backgroundMode: BackgroundMode
  ) {}

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    await this.platform.ready();

    // Initialize background mode
    if (this.platform.is('cordova')) {
      this.backgroundMode.enable();
      this.backgroundMode.on('activate').subscribe(() => {
        console.log('Background mode activated');
      });
    }

    // Initialize push notifications
    await this.initializePushNotifications();

    // Initialize local notifications
    await this.initializeLocalNotifications();

    this.isInitialized = true;
  }

  private async initializePushNotifications() {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      // Configure push notifications
      const options = {
        android: {
          senderID: 'your-sender-id',
          sound: true,
          vibrate: true,
          clearBadge: true
        },
        ios: {
          alert: true,
          badge: true,
          sound: true,
          clearBadge: true
        }
      };

      await this.push.init(options);

      // Handle registration
      this.push.on('registration').subscribe((data) => {
        console.log('Push registration successful:', data.registrationId);
        // Send registration ID to server
        this.sendRegistrationToServer(data.registrationId);
      });

      // Handle notification received
      this.push.on('notification').subscribe((data) => {
        console.log('Push notification received:', data);
        this.handleNotification(data);
      });

      // Handle notification opened
      this.push.on('notification:opened').subscribe((data) => {
        console.log('Push notification opened:', data);
        this.handleNotificationOpened(data);
      });

    } catch (error) {
      console.error('Push notification initialization failed:', error);
    }
  }

  private async initializeLocalNotifications() {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      // Request permission
      const hasPermission = await this.localNotifications.hasPermission();
      if (!hasPermission) {
        await this.localNotifications.requestPermission();
      }

      // Configure local notifications
      this.localNotifications.on('trigger').subscribe((notification) => {
        console.log('Local notification triggered:', notification);
      });

    } catch (error) {
      console.error('Local notification initialization failed:', error);
    }
  }

  async sendLocalNotification(title: string, text: string, data?: any) {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      await this.localNotifications.schedule({
        id: Date.now(),
        title,
        text,
        data,
        sound: true,
        vibrate: true
      });
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  async sendScheduledNotification(title: string, text: string, triggerTime: Date, data?: any) {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      await this.localNotifications.schedule({
        id: Date.now(),
        title,
        text,
        data,
        trigger: { at: triggerTime },
        sound: true,
        vibrate: true
      });
    } catch (error) {
      console.error('Failed to send scheduled notification:', error);
    }
  }

  async sendRepeatingNotification(title: string, text: string, interval: number, data?: any) {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      await this.localNotifications.schedule({
        id: Date.now(),
        title,
        text,
        data,
        trigger: { every: interval },
        sound: true,
        vibrate: true
      });
    } catch (error) {
      console.error('Failed to send repeating notification:', error);
    }
  }

  async cancelNotification(id: number) {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      await this.localNotifications.cancel(id);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications() {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      await this.localNotifications.cancelAll();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getScheduledNotifications() {
    if (!this.platform.is('cordova')) {
      return [];
    }

    try {
      return await this.localNotifications.getAll();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  private async sendRegistrationToServer(registrationId: string) {
    try {
      // Send registration ID to your server
      const response = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId,
          platform: this.platform.is('ios') ? 'ios' : 'android',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to register device');
      }

      console.log('Device registered successfully');
    } catch (error) {
      console.error('Failed to register device:', error);
    }
  }

  private handleNotification(data: any) {
    // Handle notification received while app is in foreground
    console.log('Notification received in foreground:', data);
    
    // You can show a toast or update UI here
    // this.showToast(data.message);
  }

  private handleNotificationOpened(data: any) {
    // Handle notification opened
    console.log('Notification opened:', data);
    
    // Navigate to relevant page based on notification data
    if (data.additionalData && data.additionalData.route) {
      // this.navController.navigateRoot(data.additionalData.route);
    }
  }

  async enableBackgroundMode() {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      await this.backgroundMode.enable();
      console.log('Background mode enabled');
    } catch (error) {
      console.error('Failed to enable background mode:', error);
    }
  }

  async disableBackgroundMode() {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      await this.backgroundMode.disable();
      console.log('Background mode disabled');
    } catch (error) {
      console.error('Failed to disable background mode:', error);
    }
  }

  async isBackgroundModeEnabled(): Promise<boolean> {
    if (!this.platform.is('cordova')) {
      return false;
    }

    try {
      return await this.backgroundMode.isEnabled();
    } catch (error) {
      console.error('Failed to check background mode status:', error);
      return false;
    }
  }

  async setBackgroundModeTitle(title: string) {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      await this.backgroundMode.setTitle(title);
    } catch (error) {
      console.error('Failed to set background mode title:', error);
    }
  }

  async setBackgroundModeText(text: string) {
    if (!this.platform.is('cordova')) {
      return;
    }

    try {
      await this.backgroundMode.setText(text);
    } catch (error) {
      console.error('Failed to set background mode text:', error);
    }
  }
}