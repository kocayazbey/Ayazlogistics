import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  PhoneIcon,
  EnvelopeIcon,
} from 'react-native-heroicons/outline';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  isVerified: boolean;
  joinDate: string;
}

interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  deliveryUpdates: boolean;
  promotionalEmails: boolean;
}

const ProfileScreen: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
    deliveryUpdates: true,
    promotionalEmails: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // TODO: Replace with actual API call
      const mockProfile: UserProfile = {
        id: '1',
        name: 'Ahmet Yılmaz',
        email: 'ahmet.yilmaz@example.com',
        phone: '+90 555 123 4567',
        company: 'ABC Lojistik A.Ş.',
        address: 'İstanbul, Türkiye',
        isVerified: true,
        joinDate: '2025-01-15',
      };
      setProfile(mockProfile);
    } catch (error) {
      Alert.alert('Hata', 'Profil bilgileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış', style: 'destructive', onPress: () => {
          // TODO: Implement logout logic
          Alert.alert('Bilgi', 'Çıkış yapıldı');
        }},
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Bilgi', 'Profil düzenleme özelliği yakında eklenecek');
  };

  const handleNotificationChange = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    // TODO: Save to backend
  };

  const menuItems = [
    {
      id: 'notifications',
      title: 'Bildirim Ayarları',
      subtitle: 'Push, email ve SMS bildirimleri',
      icon: BellIcon,
      onPress: () => Alert.alert('Bilgi', 'Bildirim ayarları yakında eklenecek'),
    },
    {
      id: 'security',
      title: 'Güvenlik',
      subtitle: 'Şifre değiştirme ve güvenlik ayarları',
      icon: ShieldCheckIcon,
      onPress: () => Alert.alert('Bilgi', 'Güvenlik ayarları yakında eklenecek'),
    },
    {
      id: 'help',
      title: 'Yardım ve Destek',
      subtitle: 'SSS, iletişim ve destek',
      icon: QuestionMarkCircleIcon,
      onPress: () => Alert.alert('Bilgi', 'Yardım ve destek yakında eklenecek'),
    },
    {
      id: 'about',
      title: 'Hakkımızda',
      subtitle: 'Uygulama bilgileri ve versiyon',
      icon: InformationCircleIcon,
      onPress: () => Alert.alert('Ayaz Logistics', 'Versiyon 1.0.0\n\nLojistik çözümleriniz için teşekkürler!'),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <UserIcon color="#ffffff" size={32} />
            </View>
            {profile?.isVerified && (
              <View style={styles.verifiedBadge}>
                <ShieldCheckIcon color="#10b981" size={16} />
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile?.name}</Text>
            <Text style={styles.email}>{profile?.email}</Text>
            <Text style={styles.joinDate}>Üye: {profile?.joinDate}</Text>
          </View>

          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Cog6ToothIcon color="#6b7280" size={20} />
          </TouchableOpacity>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <PhoneIcon color="#6b7280" size={20} />
              <Text style={styles.contactText}>{profile?.phone}</Text>
            </View>
            {profile?.company && (
              <View style={styles.contactItem}>
                <UserIcon color="#6b7280" size={20} />
                <Text style={styles.contactText}>{profile.company}</Text>
              </View>
            )}
            <View style={styles.contactItem}>
              <EnvelopeIcon color="#6b7280" size={20} />
              <Text style={styles.contactText}>{profile?.address}</Text>
            </View>
          </View>
        </View>

        {/* Quick Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı Bildirim Ayarları</Text>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>Teslimat Güncellemeleri</Text>
            <Switch
              value={notifications.deliveryUpdates}
              onValueChange={() => handleNotificationChange('deliveryUpdates')}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          </View>
          <View style={styles.notificationItem}>
            <Text style={styles.notificationText}>Promosyon E-postaları</Text>
            <Switch
              value={notifications.promotionalEmails}
              onValueChange={() => handleNotificationChange('promotionalEmails')}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ayarlar</Text>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIcon}>
                  <item.icon color="#6b7280" size={20} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <ArrowRightOnRectangleIcon color="#9ca3af" size={16} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <ArrowRightOnRectangleIcon color="#ef4444" size={20} />
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f9fafb',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  editButton: {
    padding: 8,
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
    padding: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  notificationText: {
    fontSize: 16,
    color: '#1f2937',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ef4444',
    marginLeft: 8,
  },
});

export default ProfileScreen;
