/**
 * WMS Formatting Helper
 * Formatting utilities for WMS data display
 */

export class WmsFormattingHelper {
  /**
   * Format location code for display
   * Input: A-01-02-03-04
   * Output: Zone A, Aisle 1, Rack 2, Shelf 3, Bin 4
   */
  static formatLocationCode(code: string): string {
    const parts = code.split('-');
    
    if (parts.length < 2) return code;

    const labels = ['Zone', 'Aisle', 'Rack', 'Shelf', 'Bin'];
    const formatted = parts
      .map((part, index) => `${labels[index] || 'Level ' + (index + 1)}: ${part}`)
      .join(', ');

    return formatted;
  }

  /**
   * Format weight with unit
   */
  static formatWeight(weight: number, unit: 'kg' | 'lb' | 'g' = 'kg'): string {
    return `${weight.toFixed(2)} ${unit}`;
  }

  /**
   * Format dimensions
   */
  static formatDimensions(
    length: number,
    width: number,
    height: number,
    unit: 'cm' | 'm' | 'in' = 'cm'
  ): string {
    return `${length} × ${width} × ${height} ${unit}`;
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number, currency: string = 'TRY'): string {
    const formatter = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
    });
    return formatter.format(amount);
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Format date/time for display
   */
  static formatDateTime(date: Date, locale: string = 'tr-TR'): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  /**
   * Format date only
   */
  static formatDate(date: Date, locale: string = 'tr-TR'): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  /**
   * Format duration (milliseconds to human readable)
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  /**
   * Format status badge
   */
  static formatStatusBadge(status: string): { text: string; color: string; icon: string } {
    const statusMap: Record<string, any> = {
      pending: { text: 'Pending', color: 'yellow', icon: 'clock' },
      in_progress: { text: 'In Progress', color: 'blue', icon: 'activity' },
      completed: { text: 'Completed', color: 'green', icon: 'check-circle' },
      cancelled: { text: 'Cancelled', color: 'red', icon: 'x-circle' },
      on_hold: { text: 'On Hold', color: 'orange', icon: 'pause-circle' },
      shipped: { text: 'Shipped', color: 'purple', icon: 'truck' },
      delivered: { text: 'Delivered', color: 'green', icon: 'check-circle' },
    };

    return statusMap[status] || { text: status, color: 'gray', icon: 'circle' };
  }

  /**
   * Format priority badge
   */
  static formatPriorityBadge(priority: string): { text: string; color: string; icon: string } {
    const priorityMap: Record<string, any> = {
      low: { text: 'Low', color: 'gray', icon: 'arrow-down' },
      normal: { text: 'Normal', color: 'blue', icon: 'minus' },
      high: { text: 'High', color: 'orange', icon: 'arrow-up' },
      urgent: { text: 'Urgent', color: 'red', icon: 'alert-triangle' },
    };

    return priorityMap[priority] || priorityMap.normal;
  }

  /**
   * Generate tracking number
   */
  static generateTrackingNumber(prefix: string = 'TRK'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Generate unique identifier
   */
  static generateUniqueId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Truncate text with ellipsis
   */
  static truncate(text: string, maxLength: number = 50): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Parse location code into components
   */
  static parseLocationCode(code: string): {
    zone?: string;
    aisle?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
  } {
    const parts = code.split('-');
    
    return {
      zone: parts[0],
      aisle: parts[1],
      rack: parts[2],
      shelf: parts[3],
      bin: parts[4],
    };
  }

  /**
   * Build location code from components
   */
  static buildLocationCode(components: {
    zone: string;
    aisle: string;
    rack: string;
    shelf: string;
    bin?: string;
  }): string {
    const parts = [
      components.zone,
      components.aisle.padStart(2, '0'),
      components.rack.padStart(2, '0'),
      components.shelf.padStart(2, '0'),
    ];

    if (components.bin) {
      parts.push(components.bin.padStart(2, '0'));
    }

    return parts.join('-');
  }
}

