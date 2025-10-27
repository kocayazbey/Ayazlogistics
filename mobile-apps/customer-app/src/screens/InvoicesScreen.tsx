import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  DocumentTextIcon,
  DownloadIcon,
  EyeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
} from 'react-native-heroicons/outline';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  description: string;
  shipmentId?: string;
}

const InvoicesScreen: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      // TODO: Replace with actual API call
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoiceNumber: 'FAT-2025-001',
          date: '2025-10-20',
          dueDate: '2025-11-20',
          amount: 1500.00,
          currency: 'TRY',
          status: 'pending',
          description: 'İstanbul - Ankara Kargo Ücreti',
          shipmentId: 'AYAZ2025001',
        },
        {
          id: '2',
          invoiceNumber: 'FAT-2025-002',
          date: '2025-10-15',
          dueDate: '2025-11-15',
          amount: 850.00,
          currency: 'TRY',
          status: 'paid',
          description: 'İzmir - Bursa Kargo Ücreti',
          shipmentId: 'AYAZ2025002',
        },
        {
          id: '3',
          invoiceNumber: 'FAT-2025-003',
          date: '2025-10-10',
          dueDate: '2025-10-25',
          amount: 2200.00,
          currency: 'TRY',
          status: 'overdue',
          description: 'Antalya - Samsun Kargo Ücreti',
          shipmentId: 'AYAZ2025003',
        },
      ];
      setInvoices(mockInvoices);
    } catch (error) {
      Alert.alert('Hata', 'Faturalar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Ödendi';
      case 'pending': return 'Bekliyor';
      case 'overdue': return 'Gecikmiş';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'overdue': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    Alert.alert(
      'Fatura Detayları',
      `${invoice.invoiceNumber}\nTutar: ${invoice.amount} ${invoice.currency}\nDurum: ${getStatusText(invoice.status)}`
    );
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    Alert.alert('İndirme', `${invoice.invoiceNumber} faturası indiriliyor...`);
    // TODO: Implement PDF download
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString('tr-TR')} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Faturalar</Text>
          <Text style={styles.subtitle}>Tüm faturalarınızı görüntüleyin ve yönetin</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <CurrencyDollarIcon color="#10b981" size={24} />
            <Text style={styles.summaryValue}>
              {formatAmount(
                invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
                'TRY'
              )}
            </Text>
            <Text style={styles.summaryLabel}>Ödenen</Text>
          </View>

          <View style={styles.summaryCard}>
            <CurrencyDollarIcon color="#f59e0b" size={24} />
            <Text style={styles.summaryValue}>
              {formatAmount(
                invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0),
                'TRY'
              )}
            </Text>
            <Text style={styles.summaryLabel}>Bekleyen</Text>
          </View>

          <View style={styles.summaryCard}>
            <CurrencyDollarIcon color="#ef4444" size={24} />
            <Text style={styles.summaryValue}>
              {formatAmount(
                invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0),
                'TRY'
              )}
            </Text>
            <Text style={styles.summaryLabel}>Gecikmiş</Text>
          </View>
        </View>

        {/* Invoices List */}
        <View style={styles.invoicesContainer}>
          <Text style={styles.sectionTitle}>Fatura Listesi</Text>
          {invoices.map((invoice) => (
            <View key={invoice.id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                  <Text style={styles.invoiceDescription}>{invoice.description}</Text>
                  <View style={styles.invoiceDates}>
                    <CalendarIcon color="#6b7280" size={14} />
                    <Text style={styles.dateText}>
                      {formatDate(invoice.date)} - {formatDate(invoice.dueDate)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(invoice.status)}</Text>
                </View>
              </View>

              <View style={styles.invoiceFooter}>
                <Text style={styles.amountText}>
                  {formatAmount(invoice.amount, invoice.currency)}
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleViewInvoice(invoice)}
                  >
                    <EyeIcon color="#6b7280" size={16} />
                    <Text style={styles.actionButtonText}>Görüntüle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDownloadInvoice(invoice)}
                  >
                    <DownloadIcon color="#6b7280" size={16} />
                    <Text style={styles.actionButtonText}>İndir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
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
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  invoicesContainer: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    padding: 20,
    paddingBottom: 10,
  },
  invoiceCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  invoiceHeader: {
    marginBottom: 12,
  },
  invoiceInfo: {
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  invoiceDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  invoiceDates: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
});

export default InvoicesScreen;
