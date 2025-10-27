import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { CorporateTheme } from '../../styles/CorporateTheme';

export interface CorporateButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const CorporateButton: React.FC<CorporateButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' ? CorporateTheme.colors.secondary[600] : '#ffffff'}
          style={styles.loading}
        />
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <>{icon}</>
      )}
      
      <Text style={textStyleCombined}>{title}</Text>
      
      {!loading && icon && iconPosition === 'right' && (
        <>{icon}</>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CorporateTheme.borderRadius.md,
    ...CorporateTheme.shadows.sm,
  },
  
  // Variants
  primary: {
    backgroundColor: CorporateTheme.colors.primary[600],
  },
  secondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: CorporateTheme.colors.secondary[300],
  },
  success: {
    backgroundColor: CorporateTheme.colors.accent[600],
  },
  warning: {
    backgroundColor: CorporateTheme.colors.warning[500],
  },
  danger: {
    backgroundColor: CorporateTheme.colors.error[600],
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  
  // Sizes
  sm: {
    paddingVertical: CorporateTheme.spacing.sm,
    paddingHorizontal: CorporateTheme.spacing.md,
    minHeight: 36,
  },
  md: {
    paddingVertical: CorporateTheme.spacing.md,
    paddingHorizontal: CorporateTheme.spacing.lg,
    minHeight: 44,
  },
  lg: {
    paddingVertical: CorporateTheme.spacing.lg,
    paddingHorizontal: CorporateTheme.spacing.xl,
    minHeight: 52,
  },
  
  // Text styles
  text: {
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    textAlign: 'center',
  },
  primaryText: {
    color: '#ffffff',
  },
  secondaryText: {
    color: CorporateTheme.colors.secondary[700],
  },
  successText: {
    color: '#ffffff',
  },
  warningText: {
    color: '#ffffff',
  },
  dangerText: {
    color: '#ffffff',
  },
  ghostText: {
    color: CorporateTheme.colors.primary[600],
  },
  
  // Size text styles
  smText: {
    fontSize: CorporateTheme.typography.fontSize.sm,
  },
  mdText: {
    fontSize: CorporateTheme.typography.fontSize.base,
  },
  lgText: {
    fontSize: CorporateTheme.typography.fontSize.lg,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
  
  loading: {
    marginRight: CorporateTheme.spacing.sm,
  },
});
