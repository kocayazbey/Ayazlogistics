import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { CorporateTheme } from '../../styles/CorporateTheme';

export interface CorporateCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const CorporateCard: React.FC<CorporateCardProps> = ({
  children,
  title,
  subtitle,
  header,
  footer,
  variant = 'default',
  padding = 'md',
  style,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
    style,
  ];

  return (
    <View style={cardStyle}>
      {(title || subtitle || header) && (
        <View style={styles.header}>
          {header || (
            <>
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </>
          )}
        </View>
      )}
      
      <View style={styles.content}>
        {children}
      </View>
      
      {footer && (
        <View style={styles.footer}>
          {footer}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#ffffff',
    borderRadius: CorporateTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: CorporateTheme.colors.secondary[200],
  },
  
  // Variants
  default: {
    ...CorporateTheme.shadows.sm,
  },
  elevated: {
    ...CorporateTheme.shadows.md,
  },
  outlined: {
    shadowOpacity: 0,
    elevation: 0,
  },
  
  // Padding variants
  paddingNone: {
    padding: 0,
  },
  paddingSm: {
    padding: CorporateTheme.spacing.sm,
  },
  paddingMd: {
    padding: CorporateTheme.spacing.md,
  },
  paddingLg: {
    padding: CorporateTheme.spacing.lg,
  },
  
  // Header styles
  header: {
    borderBottomWidth: 1,
    borderBottomColor: CorporateTheme.colors.secondary[200],
    paddingBottom: CorporateTheme.spacing.md,
    marginBottom: CorporateTheme.spacing.md,
  },
  title: {
    fontSize: CorporateTheme.typography.fontSize.lg,
    fontFamily: CorporateTheme.typography.fontFamily.semiBold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  subtitle: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
  },
  
  // Content styles
  content: {
    flex: 1,
  },
  
  // Footer styles
  footer: {
    borderTopWidth: 1,
    borderTopColor: CorporateTheme.colors.secondary[200],
    paddingTop: CorporateTheme.spacing.md,
    marginTop: CorporateTheme.spacing.md,
  },
});
