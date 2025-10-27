import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { CorporateButton } from '../components/ui/CorporateButton';
import { CorporateCard } from '../components/ui/CorporateCard';
import { CorporateTheme } from '../styles/CorporateTheme';

export const CorporateLoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Login successful!');
    }, 2000);
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset functionality will be implemented');
  };

  const handleRegister = () => {
    Alert.alert('Register', 'Registration functionality will be implemented');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>AL</Text>
            </View>
            <Text style={styles.appName}>AyazLogistics</Text>
            <Text style={styles.appSubtitle}>Management System</Text>
          </View>
        </View>

        {/* Login Form */}
        <CorporateCard variant="elevated" padding="lg" style={styles.loginCard}>
          <Text style={styles.loginTitle}>Welcome Back</Text>
          <Text style={styles.loginSubtitle}>Sign in to your account to continue</Text>

          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={CorporateTheme.colors.secondary[400]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={CorporateTheme.colors.secondary[400]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.passwordToggleText}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <CorporateButton
              title="Sign In"
              onPress={handleLogin}
              variant="primary"
              size="lg"
              loading={loading}
              style={styles.loginButton}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            <View style={styles.socialLogin}>
              <CorporateButton
                title="Continue with Google"
                onPress={() => Alert.alert('Google Login', 'Google login will be implemented')}
                variant="secondary"
                size="md"
                style={styles.socialButton}
              />
              <CorporateButton
                title="Continue with Apple"
                onPress={() => Alert.alert('Apple Login', 'Apple login will be implemented')}
                variant="secondary"
                size="md"
                style={styles.socialButton}
              />
            </View>
          </View>
        </CorporateCard>

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleRegister}>
            <Text style={styles.registerLink}>Sign up here</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CorporateTheme.colors.secondary[50],
  },
  
  scrollContent: {
    flexGrow: 1,
    padding: CorporateTheme.spacing.lg,
  },
  
  header: {
    alignItems: 'center',
    marginTop: CorporateTheme.spacing['3xl'],
    marginBottom: CorporateTheme.spacing['2xl'],
  },
  logoContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: CorporateTheme.borderRadius.xl,
    backgroundColor: CorporateTheme.colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: CorporateTheme.spacing.lg,
    ...CorporateTheme.shadows.lg,
  },
  logoText: {
    fontSize: CorporateTheme.typography.fontSize['3xl'],
    fontFamily: CorporateTheme.typography.fontFamily.bold,
    color: '#ffffff',
  },
  appName: {
    fontSize: CorporateTheme.typography.fontSize['2xl'],
    fontFamily: CorporateTheme.typography.fontFamily.bold,
    color: CorporateTheme.colors.secondary[900],
    marginBottom: CorporateTheme.spacing.xs,
  },
  appSubtitle: {
    fontSize: CorporateTheme.typography.fontSize.base,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
  },
  
  loginCard: {
    marginBottom: CorporateTheme.spacing.xl,
  },
  loginTitle: {
    fontSize: CorporateTheme.typography.fontSize['2xl'],
    fontFamily: CorporateTheme.typography.fontFamily.bold,
    color: CorporateTheme.colors.secondary[900],
    textAlign: 'center',
    marginBottom: CorporateTheme.spacing.sm,
  },
  loginSubtitle: {
    fontSize: CorporateTheme.typography.fontSize.base,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
    textAlign: 'center',
    marginBottom: CorporateTheme.spacing.xl,
  },
  
  form: {
    gap: CorporateTheme.spacing.lg,
  },
  inputGroup: {
    gap: CorporateTheme.spacing.sm,
  },
  inputLabel: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[700],
  },
  input: {
    ...CorporateTheme.components.input,
    fontSize: CorporateTheme.typography.fontSize.base,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    ...CorporateTheme.components.input,
    fontSize: CorporateTheme.typography.fontSize.base,
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 12,
    padding: 4,
  },
  passwordToggleText: {
    fontSize: 20,
  },
  
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -CorporateTheme.spacing.sm,
  },
  forgotPasswordText: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.primary[600],
  },
  
  loginButton: {
    marginTop: CorporateTheme.spacing.md,
  },
  
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: CorporateTheme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: CorporateTheme.colors.secondary[200],
  },
  dividerText: {
    fontSize: CorporateTheme.typography.fontSize.sm,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.secondary[500],
    marginHorizontal: CorporateTheme.spacing.md,
  },
  
  socialLogin: {
    gap: CorporateTheme.spacing.md,
  },
  socialButton: {
    marginBottom: CorporateTheme.spacing.sm,
  },
  
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: CorporateTheme.spacing.xl,
  },
  registerText: {
    fontSize: CorporateTheme.typography.fontSize.base,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[600],
  },
  registerLink: {
    fontSize: CorporateTheme.typography.fontSize.base,
    fontFamily: CorporateTheme.typography.fontFamily.medium,
    color: CorporateTheme.colors.primary[600],
  },
  
  footer: {
    alignItems: 'center',
    paddingBottom: CorporateTheme.spacing.lg,
  },
  footerText: {
    fontSize: CorporateTheme.typography.fontSize.xs,
    fontFamily: CorporateTheme.typography.fontFamily.regular,
    color: CorporateTheme.colors.secondary[500],
    textAlign: 'center',
    lineHeight: CorporateTheme.typography.lineHeight.relaxed * CorporateTheme.typography.fontSize.xs,
  },
});
