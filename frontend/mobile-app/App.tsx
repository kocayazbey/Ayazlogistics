import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, StatusBar, Alert } from 'react-native';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [screen, setScreen] = useState('login');

  const handleLogin = (email: string, password: string) => {
    const mockUsers = {
      'depocu@ayaz.com': { role: 'warehouse_operator', name: 'Ahmet Yılmaz', warehouse: 'Istanbul DC' },
      'forklift@ayaz.com': { role: 'forklift_operator', name: 'Mehmet Kaya', warehouse: 'Istanbul DC' },
      'muhasebe@ayaz.com': { role: 'accountant', name: 'Ayşe Demir', warehouse: 'Head Office' },
      'admin@ayaz.com': { role: 'admin', name: 'Ali Öz', warehouse: 'All' },
      'satis@ayaz.com': { role: 'sales', name: 'Fatma Çelik', warehouse: 'Sales Office' },
      'supervisor@ayaz.com': { role: 'supervisor', name: 'Mustafa Arslan', warehouse: 'Istanbul DC' },
    };

    const user = mockUsers[email];
    if (user && password === '123456') {
      setCurrentUser(user);
      setIsAuthenticated(true);
      setScreen('home');
    } else {
      Alert.alert('Error', 'Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setScreen('login');
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      {screen === 'home' && <HomeScreen user={currentUser} onNavigate={setScreen} onLogout={handleLogout} />}
      
      {/* Warehouse Operator Screens */}
      {screen === 'receiving' && <ReceivingScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'shipping' && <ShippingScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'pallet-transfer' && <PalletTransferScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'putaway' && <PutawayScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'quality-check' && <QualityCheckScreen user={currentUser} onBack={() => setScreen('home')} />}
      
      {/* Forklift Operator Screens */}
      {screen === 'pallet-addressing' && <PalletAddressingScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'auto-picking' && <AutoPickingScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'rt-operations' && <RTOperationsScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'tt-operations' && <TTOperationsScreen user={currentUser} onBack={() => setScreen('home')} />}
      
      {/* Accountant Screens */}
      {screen === 'invoices' && <InvoicesScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'transactions' && <TransactionsScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'financial-reports' && <FinancialReportsScreen user={currentUser} onBack={() => setScreen('home')} />}
      
      {/* Sales Screens */}
      {screen === 'new-customer' && <NewCustomerScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'quotation' && <QuotationScreen user={currentUser} onBack={() => setScreen('home')} />}
      {screen === 'contracts' && <ContractsScreen user={currentUser} onBack={() => setScreen('home')} />}
      
      {/* Supervisor Screens */}
      {screen === 'supervisor-ops' && <SupervisorOpsScreen user={currentUser} onBack={() => setScreen('home')} />}
      
      {/* Admin Screens */}
      {screen === 'admin-dashboard' && <AdminDashboardScreen user={currentUser} onBack={() => setScreen('home')} />}
    </View>
  );
};

const LoginScreen = ({ onLogin }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.loginContainer}>
      <View style={styles.loginBox}>
        <View style={styles.loginLogo}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.loginTitle}>AyazLogistics</Text>
          <Text style={styles.loginSubtitle}>Unified Mobile Platform</Text>
        </View>

        <View style={styles.loginForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@company.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => onLogin(email, password)}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </TouchableOpacity>

          <Text style={styles.demoHint}>Demo: Use any role email (depocu@ayaz.com, forklift@ayaz.com, etc.) + password: 123456</Text>
        </View>
      </View>
    </View>
  );
};

const HomeScreen = ({ user, onNavigate, onLogout }: any) => {
  const getMenuItemsForRole = (role: string) => {
    const menuConfigs = {
      warehouse_operator: [
        { id: 'receiving', icon: '📥', title: 'Mal Kabul', subtitle: 'Receiving', color: '#3b82f6' },
        { id: 'shipping', icon: '📤', title: 'Sevkiyat', subtitle: 'Shipping', color: '#10b981' },
        { id: 'pallet-transfer', icon: '🔄', title: 'Palet Transfer', subtitle: 'Pallet Transfer', color: '#f59e0b' },
        { id: 'putaway', icon: '📍', title: 'Yerleştirme', subtitle: 'Putaway', color: '#8b5cf6' },
        { id: 'quality-check', icon: '✓', title: 'Kalite Kontrol', subtitle: 'QC', color: '#ef4444' },
      ],
      forklift_operator: [
        { id: 'pallet-addressing', icon: '🏷️', title: 'Palet Adresleme', subtitle: 'Address Pallets', color: '#3b82f6' },
        { id: 'auto-picking', icon: '🤖', title: 'Otomatik Toplama', subtitle: 'Auto Picking Tasks', color: '#10b981' },
        { id: 'rt-operations', icon: '🚜', title: 'RT İşlemleri', subtitle: 'Reach Truck Ops', color: '#f59e0b' },
        { id: 'tt-operations', icon: '🏗️', title: 'TT İşlemleri', subtitle: 'Turret Truck Ops', color: '#8b5cf6' },
      ],
      accountant: [
        { id: 'invoices', icon: '💰', title: 'Faturalar', subtitle: 'Invoices', color: '#3b82f6' },
        { id: 'transactions', icon: '💳', title: 'İşlemler', subtitle: 'Transactions', color: '#10b981' },
        { id: 'financial-reports', icon: '📊', title: 'Mali Raporlar', subtitle: 'Financial Reports', color: '#f59e0b' },
      ],
      sales: [
        { id: 'new-customer', icon: '👤', title: 'Yeni Müşteri', subtitle: 'New Customer', color: '#3b82f6' },
        { id: 'quotation', icon: '📝', title: 'Teklif Çıkar', subtitle: 'Create Quote', color: '#10b981' },
        { id: 'contracts', icon: '📋', title: 'Sözleşmeler', subtitle: 'Contracts', color: '#f59e0b' },
      ],
      supervisor: [
        { id: 'supervisor-ops', icon: '👨‍💼', title: 'Supervisor İşlemleri', subtitle: 'Special Operations', color: '#ef4444' },
        { id: 'receiving', icon: '📥', title: 'Mal Kabul', subtitle: 'Receiving', color: '#3b82f6' },
        { id: 'shipping', icon: '📤', title: 'Sevkiyat', subtitle: 'Shipping', color: '#10b981' },
      ],
      admin: [
        { id: 'admin-dashboard', icon: '📊', title: 'Admin Dashboard', subtitle: 'Full Access', color: '#ef4444' },
        { id: 'receiving', icon: '📥', title: 'Mal Kabul', subtitle: 'Receiving', color: '#3b82f6' },
        { id: 'shipping', icon: '📤', title: 'Sevkiyat', subtitle: 'Shipping', color: '#10b981' },
        { id: 'pallet-transfer', icon: '🔄', title: 'Palet Transfer', subtitle: 'Transfer', color: '#f59e0b' },
        { id: 'invoices', icon: '💰', title: 'Faturalar', subtitle: 'Invoices', color: '#8b5cf6' },
        { id: 'new-customer', icon: '👤', title: 'Yeni Müşteri', subtitle: 'New Customer', color: '#ec4899' },
      ],
    };

    return menuConfigs[role] || [];
  };

  const menuItems = getMenuItemsForRole(user.role);

  return (
    <ScrollView style={styles.homeContainer}>
      <View style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerGreeting}>Merhaba, {user.name}</Text>
            <Text style={styles.headerSubtitle}>{user.warehouse} • {getRoleDisplay(user.role)}</Text>
          </View>
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Çıkış</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsSection}>
        {user.role === 'warehouse_operator' && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Pending Receiving</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.statValue}>18</Text>
              <Text style={styles.statLabel}>Ready to Ship</Text>
            </View>
          </View>
        )}

        {user.role === 'forklift_operator' && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Pending Tasks</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.statValue}>45</Text>
              <Text style={styles.statLabel}>Completed Today</Text>
            </View>
          </View>
        )}

        {user.role === 'accountant' && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.statValue}>₺2.4M</Text>
              <Text style={styles.statLabel}>Monthly Revenue</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
              <Text style={styles.statValue}>₺456K</Text>
              <Text style={styles.statLabel}>Outstanding</Text>
            </View>
          </View>
        )}

        {user.role === 'sales' && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
              <Text style={styles.statValue}>8</Text>
              <Text style={styles.statLabel}>Hot Leads</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
              <Text style={styles.statValue}>₺3.2M</Text>
              <Text style={styles.statLabel}>Pipeline Value</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuCard, { backgroundColor: item.color }]}
              onPress={() => onNavigate(item.id)}
            >
              <Text style={styles.menuCardIcon}>{item.icon}</Text>
              <Text style={styles.menuCardTitle}>{item.title}</Text>
              <Text style={styles.menuCardSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {user.role === 'warehouse_operator' && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          {[
            { action: 'Received PO-12345', time: '10 min ago', icon: '📥' },
            { action: 'Shipped Order #5678', time: '25 min ago', icon: '📤' },
            { action: 'Transfer completed', time: '1 hour ago', icon: '🔄' },
          ].map((activity, idx) => (
            <View key={idx} style={styles.activityItem}>
              <Text style={styles.activityIcon}>{activity.icon}</Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityAction}>{activity.action}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {user.role === 'forklift_operator' && (
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Assigned Tasks</Text>
          {[
            { task: 'Pick from A-01-L05-P02', product: 'SKU-12345', qty: '100 units', priority: 'high' },
            { task: 'Putaway to B-03-L02-P01', product: 'SKU-67890', qty: '200 units', priority: 'normal' },
          ].map((task, idx) => (
            <View key={idx} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{task.task}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: task.priority === 'high' ? '#ef4444' : '#3b82f6' }]}>
                  <Text style={styles.priorityText}>{task.priority.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.taskProduct}>{task.product} • {task.qty}</Text>
              <TouchableOpacity style={styles.startTaskButton}>
                <Text style={styles.startTaskText}>▶ Start Task</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const ReceivingScreen = ({ user, onBack }: any) => {
  const [step, setStep] = useState(1);
  const [poNumber, setPoNumber] = useState('');
  const [productBarcode, setProductBarcode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [condition, setCondition] = useState('good');

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Mal Kabul</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
            <Text style={[styles.progressStepText, step >= 1 && styles.progressStepTextActive]}>1</Text>
          </View>
          <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
          <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
            <Text style={[styles.progressStepText, step >= 2 && styles.progressStepTextActive]}>2</Text>
          </View>
          <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
          <View style={[styles.progressStep, step >= 3 && styles.progressStepActive]}>
            <Text style={[styles.progressStepText, step >= 3 && styles.progressStepTextActive]}>3</Text>
          </View>
          <View style={[styles.progressLine, step >= 4 && styles.progressLineActive]} />
          <View style={[styles.progressStep, step >= 4 && styles.progressStepActive]}>
            <Text style={[styles.progressStepText, step >= 4 && styles.progressStepTextActive]}>4</Text>
          </View>
        </View>

        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabel, step === 1 && styles.stepLabelActive]}>PO Scan</Text>
          <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>Product</Text>
          <Text style={[styles.stepLabel, step === 3 && styles.stepLabelActive]}>Details</Text>
          <Text style={[styles.stepLabel, step === 4 && styles.stepLabelActive]}>Confirm</Text>
        </View>

        {step === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Scan Purchase Order</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PO Number / Sipariş No</Text>
              <TextInput
                style={styles.input}
                placeholder="PO-2025-001"
                value={poNumber}
                onChangeText={setPoNumber}
              />
            </View>
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷 Barkod Tara / Scan Barcode</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(2)}>
              <Text style={styles.primaryButtonText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Scan Product</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Product Barcode / Ürün Barkod</Text>
              <TextInput
                style={styles.input}
                placeholder="SKU-12345"
                value={productBarcode}
                onChangeText={setProductBarcode}
              />
            </View>
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷 Barkod Tara / Scan Barcode</Text>
            </TouchableOpacity>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
                <Text style={styles.secondaryButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(3)}>
                <Text style={styles.primaryButtonText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Enter Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Quantity / Miktar</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Lot Number / Lot No (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="LOT-2025-001"
                value={lotNumber}
                onChangeText={setLotNumber}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Condition / Durum</Text>
              <View style={styles.conditionButtons}>
                {['good', 'damaged', 'expired'].map(cond => (
                  <TouchableOpacity
                    key={cond}
                    style={[styles.conditionButton, condition === cond && styles.conditionButtonActive]}
                    onPress={() => setCondition(cond)}
                  >
                    <Text style={[styles.conditionButtonText, condition === cond && styles.conditionButtonTextActive]}>
                      {cond === 'good' ? '✓ İyi' : cond === 'damaged' ? '⚠ Hasarlı' : '❌ SKT Geçmiş'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
                <Text style={styles.secondaryButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStep(4)}>
                <Text style={styles.primaryButtonText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Confirm Receipt</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>PO Number:</Text>
                <Text style={styles.summaryValue}>{poNumber || 'N/A'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Product:</Text>
                <Text style={styles.summaryValue}>{productBarcode || 'N/A'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Quantity:</Text>
                <Text style={styles.summaryValue}>{quantity || '0'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Lot:</Text>
                <Text style={styles.summaryValue}>{lotNumber || 'N/A'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Condition:</Text>
                <Text style={[styles.summaryValue, { color: condition === 'good' ? '#10b981' : '#ef4444' }]}>
                  {condition.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(3)}>
                <Text style={styles.secondaryButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={() => {
                Alert.alert('Success', 'Receipt confirmed!');
                setStep(1);
                setPoNumber('');
                setProductBarcode('');
                setQuantity('');
                setLotNumber('');
              }}>
                <Text style={styles.confirmButtonText}>✓ Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const ShippingScreen = ({ user, onBack }: any) => {
  const [shipments, setShipments] = useState([
    { id: '1', number: 'SHIP-001', customer: 'Acme Corp', items: 24, status: 'pending', pallets: 6 },
    { id: '2', number: 'SHIP-002', customer: 'Global Ltd', items: 18, status: 'loading', pallets: 4 },
  ]);

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Sevkiyat / Shipping</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        {shipments.map(shipment => (
          <View key={shipment.id} style={styles.shipmentCard}>
            <View style={styles.shipmentHeader}>
              <Text style={styles.shipmentNumber}>{shipment.number}</Text>
              <View style={[styles.statusBadge, { 
                backgroundColor: shipment.status === 'loading' ? '#3b82f6' : '#f59e0b'
              }]}>
                <Text style={styles.statusBadgeText}>{shipment.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.shipmentCustomer}>{shipment.customer}</Text>
            <View style={styles.shipmentDetails}>
              <Text style={styles.shipmentDetail}>📦 {shipment.items} items</Text>
              <Text style={styles.shipmentDetail}>🏷️ {shipment.pallets} pallets</Text>
            </View>
            <TouchableOpacity style={styles.shipmentActionButton}>
              <Text style={styles.shipmentActionText}>
                {shipment.status === 'pending' ? 'Start Loading' : 'Continue Loading'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const PalletTransferScreen = ({ user, onBack }: any) => {
  const [fromPallet, setFromPallet] = useState('');
  const [toLocation, setToLocation] = useState('');

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Palet Transfer</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Source Pallet / Kaynak Palet</Text>
            <TextInput
              style={styles.input}
              placeholder="PLT-12345"
              value={fromPallet}
              onChangeText={setFromPallet}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷 Scan Pallet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Location / Hedef Lokasyon</Text>
            <TextInput
              style={styles.input}
              placeholder="A-01-L02-P03"
              value={toLocation}
              onChangeText={setToLocation}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷 Scan Location</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>ℹ️ System will verify location availability</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>✓ Execute Transfer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const PutawayScreen = ({ user, onBack }: any) => {
  const [productScan, setProductScan] = useState('');
  const [quantity, setQuantity] = useState('');
  const [suggestedLocation, setSuggestedLocation] = useState('A-01-L05-P03');

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Yerleştirme / Putaway</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Product / Ürün</Text>
            <TextInput
              style={styles.input}
              placeholder="Scan product barcode"
              value={productScan}
              onChangeText={setProductScan}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷 Scan Product</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Quantity / Miktar</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionLabel}>🎯 Suggested Location / Önerilen Konum</Text>
            <Text style={styles.suggestionValue}>{suggestedLocation}</Text>
            <Text style={styles.suggestionHint}>System optimized based on ABC analysis</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Actual Location / Gerçek Konum</Text>
            <TextInput
              style={styles.input}
              placeholder={suggestedLocation}
              defaultValue={suggestedLocation}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷 Scan Location</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>✓ Complete Putaway</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const QualityCheckScreen = ({ user, onBack }: any) => {
  const [palletId, setPalletId] = useState('');
  const [checkResults, setCheckResults] = useState<any>(null);

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Kalite Kontrol / QC</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pallet ID</Text>
            <TextInput
              style={styles.input}
              placeholder="PLT-12345"
              value={palletId}
              onChangeText={setPalletId}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷 Scan Pallet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.qcSection}>
            <Text style={styles.qcSectionTitle}>Visual Inspection</Text>
            <TouchableOpacity style={styles.photoButton}>
              <Text style={styles.photoButtonText}>📷 Take Photos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.qcSection}>
            <Text style={styles.qcSectionTitle}>Quality Checks</Text>
            {['Packaging intact', 'Labels readable', 'No damage', 'Correct quantity'].map((check, idx) => (
              <View key={idx} style={styles.checkItem}>
                <Text style={styles.checkText}>{check}</Text>
                <View style={styles.checkButtons}>
                  <TouchableOpacity style={styles.checkButtonPass}>
                    <Text style={styles.checkButtonPassText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.checkButtonFail}>
                    <Text style={styles.checkButtonFailText}>✗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>✓ Complete QC</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const PalletAddressingScreen = ({ user, onBack }: any) => {
  const [palletId, setPalletId] = useState('');
  const [targetLocation, setTargetLocation] = useState('');

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Palet Adresleme</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pallet ID</Text>
            <TextInput
              style={styles.input}
              placeholder="PLT-12345"
              value={palletId}
              onChangeText={setPalletId}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷 Scan Pallet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.palletInfo}>
            <Text style={styles.palletInfoLabel}>Product: SKU-12345</Text>
            <Text style={styles.palletInfoLabel}>Quantity: 100 units</Text>
            <Text style={styles.palletInfoLabel}>Weight: 250 kg</Text>
            <Text style={styles.palletInfoLabel}>Dimensions: 120×80×150 cm</Text>
          </View>

          <View style={styles.suggestionCard}>
            <Text style={styles.suggestionLabel}>🎯 Optimal Location</Text>
            <Text style={styles.suggestionValue}>B-05-L03-P01</Text>
            <Text style={styles.suggestionHint}>Based on velocity and capacity</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Location</Text>
            <TextInput
              style={styles.input}
              placeholder="B-05-L03-P01"
              value={targetLocation}
              onChangeText={setTargetLocation}
            />
            <TouchableOpacity style={styles.scanButton}>
              <Text style={styles.scanButtonText}>📷 Scan Location</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>✓ Place Pallet</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const AutoPickingScreen = ({ user, onBack }: any) => {
  const tasks = [
    { id: '1', location: 'A-01-L05-P02', product: 'SKU-12345', qty: 50, order: 'ORD-001', priority: 'high' },
    { id: '2', location: 'A-02-L03-P01', product: 'SKU-67890', qty: 30, order: 'ORD-001', priority: 'high' },
    { id: '3', location: 'B-05-L02-P03', product: 'SKU-11111', qty: 75, order: 'ORD-002', priority: 'normal' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Otomatik Toplama</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.taskSummary}>
        <View style={styles.taskSummaryItem}>
          <Text style={styles.taskSummaryValue}>3</Text>
          <Text style={styles.taskSummaryLabel}>Pending Tasks</Text>
        </View>
        <View style={styles.taskSummaryItem}>
          <Text style={styles.taskSummaryValue}>155</Text>
          <Text style={styles.taskSummaryLabel}>Total Units</Text>
        </View>
      </View>

      <ScrollView style={styles.screenContent}>
        {tasks.map((task, idx) => (
          <View key={task.id} style={styles.pickingTaskCard}>
            <View style={styles.taskCardHeader}>
              <View style={styles.taskSequence}>
                <Text style={styles.taskSequenceText}>{idx + 1}</Text>
              </View>
              <View style={styles.taskCardInfo}>
                <Text style={styles.taskCardLocation}>{task.location}</Text>
                <Text style={styles.taskCardProduct}>{task.product}</Text>
              </View>
              <View style={[styles.taskPriorityBadge, { 
                backgroundColor: task.priority === 'high' ? '#ef4444' : '#3b82f6'
              }]}>
                <Text style={styles.taskPriorityText}>{task.priority.toUpperCase()}</Text>
              </View>
            </View>
            
            <View style={styles.taskCardDetails}>
              <Text style={styles.taskCardDetail}>📦 Quantity: {task.qty} units</Text>
              <Text style={styles.taskCardDetail}>📋 Order: {task.order}</Text>
            </View>

            <TouchableOpacity style={styles.startPickButton}>
              <Text style={styles.startPickButtonText}>▶ Start Picking</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const RTOperationsScreen = ({ user, onBack }: any) => {
  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>RT Operations</Text>
        <Text style={styles.screenSubtitle}>Reach Truck</Text>
      </View>

      <View style={styles.equipmentInfo}>
        <Text style={styles.equipmentLabel}>Equipment: RT-001</Text>
        <Text style={styles.equipmentLabel}>Max Height: 12m</Text>
        <Text style={styles.equipmentLabel}>Max Weight: 2,500kg</Text>
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>RT Task</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pallet ID</Text>
            <TextInput style={styles.input} placeholder="PLT-12345" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target Height (m)</Text>
            <TextInput style={styles.input} placeholder="8.5" keyboardType="numeric" />
          </View>
          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>✓ Complete RT Operation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const TTOperationsScreen = ({ user, onBack }: any) => {
  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>TT Operations</Text>
        <Text style={styles.screenSubtitle}>Turret Truck / VNA</Text>
      </View>

      <View style={styles.equipmentInfo}>
        <Text style={styles.equipmentLabel}>Equipment: TT-001</Text>
        <Text style={styles.equipmentLabel}>Max Height: 18m</Text>
        <Text style={styles.equipmentLabel}>Aisle Width: 1.8m</Text>
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Narrow Aisle Entry</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Aisle Code</Text>
            <TextInput style={styles.input} placeholder="A-05" />
          </View>
          
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ Check aisle is clear before entry</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>🚪 Enter Aisle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const InvoicesScreen = ({ user, onBack }: any) => {
  const invoices = [
    { number: 'INV-2025-001', customer: 'Acme Corp', amount: '₺125,450', status: 'paid', date: '2025-10-15' },
    { number: 'INV-2025-002', customer: 'Global Ltd', amount: '₺89,320', status: 'pending', date: '2025-10-20' },
    { number: 'INV-2025-003', customer: 'TechStore', amount: '₺156,780', status: 'overdue', date: '2025-10-10' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Faturalar / Invoices</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.financialSummary}>
        <View style={styles.financialCard}>
          <Text style={styles.financialValue}>₺2.4M</Text>
          <Text style={styles.financialLabel}>Revenue MTD</Text>
        </View>
        <View style={styles.financialCard}>
          <Text style={[styles.financialValue, { color: '#f59e0b' }]}>₺456K</Text>
          <Text style={styles.financialLabel}>Outstanding</Text>
        </View>
      </View>

      <ScrollView style={styles.screenContent}>
        {invoices.map((invoice, idx) => (
          <View key={idx} style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceNumber}>{invoice.number}</Text>
              <View style={[styles.invoiceStatusBadge, {
                backgroundColor: invoice.status === 'paid' ? '#10b981' : invoice.status === 'pending' ? '#f59e0b' : '#ef4444'
              }]}>
                <Text style={styles.invoiceStatusText}>{invoice.status.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.invoiceCustomer}>{invoice.customer}</Text>
            <View style={styles.invoiceDetails}>
              <Text style={styles.invoiceAmount}>{invoice.amount}</Text>
              <Text style={styles.invoiceDate}>{invoice.date}</Text>
            </View>
            <TouchableOpacity style={styles.viewInvoiceButton}>
              <Text style={styles.viewInvoiceButtonText}>View Invoice</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const TransactionsScreen = ({ user, onBack }: any) => {
  const transactions = [
    { id: '1', type: 'Payment Received', amount: '+₺125,450', customer: 'Acme Corp', date: '2025-10-24 10:30' },
    { id: '2', type: 'Invoice Generated', amount: '₺89,320', customer: 'Global Ltd', date: '2025-10-24 09:15' },
    { id: '3', type: 'Expense', amount: '-₺12,500', description: 'Fuel costs', date: '2025-10-23 16:45' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onBack={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>İşlemler / Transactions</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        {transactions.map(transaction => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionType}>{transaction.type}</Text>
              <Text style={[styles.transactionAmount, {
                color: transaction.amount.startsWith('+') ? '#10b981' : '#ef4444'
              }]}>
                {transaction.amount}
              </Text>
            </View>
            <Text style={styles.transactionCustomer}>{transaction.customer || transaction.description}</Text>
            <Text style={styles.transactionDate}>{transaction.date}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const FinancialReportsScreen = ({ user, onBack }: any) => {
  const reports = [
    { name: 'Income Statement', period: 'October 2025', icon: '📊' },
    { name: 'Balance Sheet', period: 'Q3 2025', icon: '📈' },
    { name: 'Cash Flow', period: 'October 2025', icon: '💰' },
    { name: 'Aged Receivables', period: 'As of today', icon: '📅' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Mali Raporlar</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        {reports.map((report, idx) => (
          <TouchableOpacity key={idx} style={styles.reportCard}>
            <Text style={styles.reportIcon}>{report.icon}</Text>
            <View style={styles.reportInfo}>
              <Text style={styles.reportName}>{report.name}</Text>
              <Text style={styles.reportPeriod}>{report.period}</Text>
            </View>
            <Text style={styles.reportChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const NewCustomerScreen = ({ user, onBack }: any) => {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Yeni Müşteri</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company Name / Firma Adı</Text>
            <TextInput
              style={styles.input}
              placeholder="Acme Corporation"
              value={companyName}
              onChangeText={setCompanyName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contact Person / Yetkili</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              value={contactPerson}
              onChangeText={setContactPerson}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="john@acme.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone / Telefon</Text>
            <TextInput
              style={styles.input}
              placeholder="+90 555 123 4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Customer Type / Müşteri Tipi</Text>
            <View style={styles.radioGroup}>
              {['3PL', 'Shipper', 'E-commerce', 'Distributor'].map(type => (
                <TouchableOpacity key={type} style={styles.radioButton}>
                  <View style={styles.radio} />
                  <Text style={styles.radioLabel}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>✓ Save Customer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const QuotationScreen = ({ user, onBack }: any) => {
  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Teklif Çıkar / Quotation</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Customer / Müşteri</Text>
            <TextInput style={styles.input} placeholder="Select customer..." />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Type / Hizmet Tipi</Text>
            <View style={styles.serviceOptions}>
              {['Warehousing', 'Transportation', '3PL', 'Fulfillment'].map(service => (
                <TouchableOpacity key={service} style={styles.serviceOption}>
                  <Text style={styles.serviceOptionText}>{service}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Storage Area (m²)</Text>
            <TextInput style={styles.input} placeholder="1000" keyboardType="numeric" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Monthly Volume (pallets)</Text>
            <TextInput style={styles.input} placeholder="500" keyboardType="numeric" />
          </View>

          <View style={styles.quotationSummary}>
            <Text style={styles.quotationSummaryLabel}>Estimated Monthly Cost</Text>
            <Text style={styles.quotationSummaryValue}>₺45,000</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>📄 Generate Quotation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const ContractsScreen = ({ user, onBack }: any) => {
  const contracts = [
    { id: '1', customer: 'Acme Corp', type: 'Annual Storage', value: '₺2.4M', status: 'active', startDate: '2025-01-01' },
    { id: '2', customer: 'Global Ltd', type: 'Transportation', value: '₺1.8M', status: 'active', startDate: '2025-06-01' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Sözleşmeler / Contracts</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.screenContent}>
        {contracts.map(contract => (
          <View key={contract.id} style={styles.contractCard}>
            <View style={styles.contractHeader}>
              <Text style={styles.contractCustomer}>{contract.customer}</Text>
              <View style={styles.contractStatusBadge}>
                <Text style={styles.contractStatusText}>ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.contractType}>{contract.type}</Text>
            <View style={styles.contractDetails}>
              <Text style={styles.contractValue}>{contract.value}</Text>
              <Text style={styles.contractDate}>From: {contract.startDate}</Text>
            </View>
            <TouchableOpacity style={styles.viewContractButton}>
              <Text style={styles.viewContractButtonText}>View Contract</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const SupervisorOpsScreen = ({ user, onBack }: any) => {
  const supervisorOps = [
    { id: 'change-pickface', title: 'Toplama Gözü Değiştir', subtitle: 'Change pick face', icon: '🔄' },
    { id: 'modify-lot', title: 'Palet Lot & Tarih Değiştir', subtitle: 'Modify lot & dates', icon: '📅' },
    { id: 'block-pallet', title: 'Palet Blokaj', subtitle: 'Block/unblock pallet', icon: '🚫' },
    { id: 'define-barcode', title: 'SKU Barkod Tanımla', subtitle: 'Define SKU barcode', icon: '🏷️' },
    { id: 'its-qc', title: 'ITS Kalite Kontrol', subtitle: 'Intelligent QC', icon: '🔍' },
    { id: 'emergency-override', title: 'Acil Müdahale', subtitle: 'Emergency override', icon: '⚠️' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Supervisor Operations</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.supervisorAlert}>
        <Text style={styles.supervisorAlertText}>⚠️ Authorized Personnel Only</Text>
      </View>

      <ScrollView style={styles.screenContent}>
        {supervisorOps.map(op => (
          <TouchableOpacity key={op.id} style={styles.supervisorOpCard}>
            <Text style={styles.supervisorOpIcon}>{op.icon}</Text>
            <View style={styles.supervisorOpInfo}>
              <Text style={styles.supervisorOpTitle}>{op.title}</Text>
              <Text style={styles.supervisorOpSubtitle}>{op.subtitle}</Text>
            </View>
            <Text style={styles.supervisorOpChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const AdminDashboardScreen = ({ user, onBack }: any) => {
  const modules = [
    { id: 'wms', name: 'Warehouse Management', icon: '📦', count: '8 warehouses' },
    { id: 'tms', name: 'Transportation', icon: '🚚', count: '48 vehicles' },
    { id: 'crm', name: 'Customer Relations', icon: '👥', count: '156 customers' },
    { id: 'billing', name: 'Billing & Finance', icon: '💰', count: '₺24.8M revenue' },
    { id: 'analytics', name: 'Analytics', icon: '📊', count: '40+ reports' },
    { id: 'users', name: 'User Management', icon: '👤', count: '123 users' },
  ];

  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Admin Dashboard</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.adminStats}>
        <View style={styles.adminStatCard}>
          <Text style={styles.adminStatValue}>99.2%</Text>
          <Text style={styles.adminStatLabel}>System Uptime</Text>
        </View>
        <View style={styles.adminStatCard}>
          <Text style={styles.adminStatValue}>10.2K</Text>
          <Text style={styles.adminStatLabel}>Daily Operations</Text>
        </View>
      </View>

      <ScrollView style={styles.screenContent}>
        <Text style={styles.modulesTitle}>All Modules</Text>
        {modules.map(module => (
          <TouchableOpacity key={module.id} style={styles.moduleCard}>
            <Text style={styles.moduleIcon}>{module.icon}</Text>
            <View style={styles.moduleInfo}>
              <Text style={styles.moduleName}>{module.name}</Text>
              <Text style={styles.moduleCount}>{module.count}</Text>
            </View>
            <Text style={styles.moduleChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

function getRoleDisplay(role: string): string {
  const roleNames = {
    warehouse_operator: 'Warehouse Operator',
    forklift_operator: 'Forklift Operator',
    accountant: 'Accountant',
    admin: 'System Administrator',
    sales: 'Sales Representative',
    supervisor: 'Warehouse Supervisor',
  };
  return roleNames[role] || role;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loginContainer: { flex: 1, backgroundColor: '#f0f9ff', justifyContent: 'center', padding: 20 },
  loginBox: { backgroundColor: 'white', borderRadius: 24, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  loginLogo: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { color: 'white', fontSize: 36, fontWeight: 'bold' },
  loginTitle: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  loginSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  loginForm: { gap: 16 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 16, fontSize: 16 },
  loginButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  demoHint: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 16 },
  homeContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  headerGradient: { backgroundColor: '#007AFF', paddingTop: 50, paddingBottom: 24 },
  headerContent: { paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerGreeting: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  logoutButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: 'white', fontSize: 14, fontWeight: '600' },
  statsSection: { padding: 16 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#111' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  menuSection: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  menuCard: { width: '48%', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  menuCardIcon: { fontSize: 36, marginBottom: 8 },
  menuCardTitle: { fontSize: 14, fontWeight: '600', color: 'white', textAlign: 'center', marginBottom: 4 },
  menuCardSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  recentSection: { padding: 16 },
  activityItem: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  activityIcon: { fontSize: 24 },
  activityContent: { flex: 1 },
  activityAction: { fontSize: 14, fontWeight: '500', color: '#111' },
  activityTime: { fontSize: 12, color: '#666', marginTop: 2 },
  tasksSection: { padding: 16 },
  screen: { flex: 1, backgroundColor: '#f5f5f5' },
  screenHeader: { backgroundColor: 'white', paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backButton: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  screenTitle: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  screenSubtitle: { fontSize: 12, color: '#666', textAlign: 'center' },
  screenContent: { flex: 1, padding: 16 },
  formCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 16 },
  scanButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  scanButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  primaryButton: { backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  secondaryButton: { flex: 1, backgroundColor: '#e5e7eb', padding: 16, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  confirmButton: { flex: 1, backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center' },
  confirmButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  progressBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  progressStep: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  progressStepActive: { backgroundColor: '#007AFF' },
  progressStepText: { color: '#9ca3af', fontWeight: 'bold', fontSize: 14 },
  progressStepTextActive: { color: 'white' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#e5e7eb' },
  progressLineActive: { backgroundColor: '#007AFF' },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  stepLabel: { fontSize: 11, color: '#9ca3af' },
  stepLabelActive: { color: '#007AFF', fontWeight: '600' },
  conditionButtons: { flexDirection: 'row', gap: 8 },
  conditionButton: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, alignItems: 'center' },
  conditionButtonActive: { borderColor: '#007AFF', backgroundColor: '#eff6ff' },
  conditionButtonText: { fontSize: 14, color: '#666' },
  conditionButtonTextActive: { color: '#007AFF', fontWeight: '600' },
  summaryCard: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#666' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111' },
  infoBox: { backgroundColor: '#dbeafe', borderRadius: 10, padding: 12, marginTop: 12 },
  infoBoxText: { fontSize: 13, color: '#1e40af' },
  suggestionCard: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, marginTop: 12, marginBottom: 12 },
  suggestionLabel: { fontSize: 14, color: '#166534', marginBottom: 8 },
  suggestionValue: { fontSize: 24, fontWeight: 'bold', color: '#10b981', marginBottom: 4 },
  suggestionHint: { fontSize: 11, color: '#16a34a' },
  shipmentCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  shipmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  shipmentNumber: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusBadgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  shipmentCustomer: { fontSize: 16, fontWeight: '500', color: '#111', marginBottom: 8 },
  shipmentDetails: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  shipmentDetail: { fontSize: 13, color: '#666' },
  shipmentActionButton: { backgroundColor: '#007AFF', padding: 14, borderRadius: 10, alignItems: 'center' },
  shipmentActionText: { color: 'white', fontSize: 14, fontWeight: '600' },
  taskSummary: { backgroundColor: 'white', padding: 16, flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  taskSummaryItem: { flex: 1, alignItems: 'center' },
  taskSummaryValue: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' },
  taskSummaryLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  pickingTaskCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  taskCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  taskSequence: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center' },
  taskSequenceText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  taskCardInfo: { flex: 1 },
  taskCardLocation: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  taskCardProduct: { fontSize: 13, color: '#666', marginTop: 2 },
  taskPriorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  taskPriorityText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  taskCardDetails: { marginBottom: 12 },
  taskCardDetail: { fontSize: 13, color: '#666', marginBottom: 4 },
  startPickButton: { backgroundColor: '#10b981', padding: 14, borderRadius: 10, alignItems: 'center' },
  startPickButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  equipmentInfo: { backgroundColor: '#dbeafe', padding: 16, marginHorizontal: 16, marginTop: 8, borderRadius: 12 },
  equipmentLabel: { fontSize: 13, color: '#1e40af', marginBottom: 4 },
  warningBox: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginTop: 12 },
  warningText: { fontSize: 13, color: '#92400e' },
  financialSummary: { backgroundColor: 'white', padding: 16, flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  financialCard: { flex: 1, alignItems: 'center' },
  financialValue: { fontSize: 24, fontWeight: 'bold', color: '#10b981' },
  financialLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  invoiceCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceNumber: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  invoiceStatusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  invoiceStatusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  invoiceCustomer: { fontSize: 14, color: '#666', marginBottom: 8 },
  invoiceDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  invoiceAmount: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
  invoiceDate: { fontSize: 13, color: '#666' },
  viewInvoiceButton: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  viewInvoiceButtonText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  transactionCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  transactionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  transactionType: { fontSize: 14, fontWeight: '600', color: '#111' },
  transactionAmount: { fontSize: 18, fontWeight: 'bold' },
  transactionCustomer: { fontSize: 13, color: '#666', marginBottom: 4 },
  transactionDate: { fontSize: 12, color: '#9ca3af' },
  reportCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  reportIcon: { fontSize: 32, marginRight: 16 },
  reportInfo: { flex: 1 },
  reportName: { fontSize: 16, fontWeight: '600', color: '#111' },
  reportPeriod: { fontSize: 13, color: '#666', marginTop: 2 },
  reportChevron: { fontSize: 24, color: '#d1d5db' },
  radioGroup: { gap: 12 },
  radioButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db' },
  radioLabel: { fontSize: 14, color: '#374151' },
  serviceOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceOption: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, alignItems: 'center' },
  serviceOptionText: { fontSize: 13, color: '#374151' },
  quotationSummary: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' },
  quotationSummaryLabel: { fontSize: 14, color: '#166534', marginBottom: 8 },
  quotationSummaryValue: { fontSize: 32, fontWeight: 'bold', color: '#10b981' },
  contractCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12 },
  contractHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  contractCustomer: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  contractStatusBadge: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  contractStatusText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  contractType: { fontSize: 14, color: '#666', marginBottom: 8 },
  contractDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  contractValue: { fontSize: 20, fontWeight: 'bold', color: '#10b981' },
  contractDate: { fontSize: 13, color: '#666' },
  viewContractButton: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  viewContractButtonText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  supervisorAlert: { backgroundColor: '#fef3c7', padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 10 },
  supervisorAlertText: { fontSize: 14, color: '#92400e', textAlign: 'center', fontWeight: '600' },
  supervisorOpCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  supervisorOpIcon: { fontSize: 32, marginRight: 16 },
  supervisorOpInfo: { flex: 1 },
  supervisorOpTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  supervisorOpSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  supervisorOpChevron: { fontSize: 24, color: '#d1d5db' },
  adminStats: { backgroundColor: 'white', padding: 16, flexDirection: 'row', gap: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  adminStatCard: { flex: 1, alignItems: 'center' },
  adminStatValue: { fontSize: 24, fontWeight: 'bold', color: '#10b981' },
  adminStatLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  modulesTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 12 },
  moduleCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  moduleIcon: { fontSize: 32, marginRight: 16 },
  moduleInfo: { flex: 1 },
  moduleName: { fontSize: 16, fontWeight: '600', color: '#111' },
  moduleCount: { fontSize: 13, color: '#666', marginTop: 2 },
  moduleChevron: { fontSize: 24, color: '#d1d5db' },
  palletInfo: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, marginBottom: 16 },
  palletInfoLabel: { fontSize: 14, color: '#166534', marginBottom: 6 },
  qcSection: { marginBottom: 16 },
  qcSectionTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 12 },
  photoButton: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 10, alignItems: 'center' },
  photoButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  checkItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  checkText: { fontSize: 14, color: '#374151' },
  checkButtons: { flexDirection: 'row', gap: 8 },
  checkButtonPass: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  checkButtonPassText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  checkButtonFail: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  checkButtonFailText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});

export default App;

