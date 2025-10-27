import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function OpportunitiesScreen() {
  const [opportunities] = useState([
    { id: '1', company: 'Tech Corp', value: 850000, stage: 'Proposal', probability: 70, contact: 'John Doe' },
    { id: '2', company: 'Retail Inc.', value: 1200000, stage: 'Negotiation', probability: 85, contact: 'Jane Smith' },
    { id: '3', company: 'Manufacturing Ltd.', value: 650000, stage: 'Qualification', probability: 50, contact: 'Bob Johnson' },
  ]);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Negotiation': return '#10b981';
      case 'Proposal': return '#f59e0b';
      case 'Qualification': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Opportunities</Text>
        <Text style={styles.subtitle}>{opportunities.length} active opportunities</Text>
      </View>

      <View style={styles.opportunitiesSection}>
        {opportunities.map((opp) => (
          <TouchableOpacity key={opp.id} style={styles.oppCard}>
            <View style={styles.oppHeader}>
              <Text style={styles.company}>{opp.company}</Text>
              <View style={[styles.stageBadge, { backgroundColor: getStageColor(opp.stage) }]}>
                <Text style={styles.stageText}>{opp.stage}</Text>
              </View>
            </View>

            <View style={styles.oppDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Value:</Text>
                <Text style={styles.value}>₺{(opp.value / 1000).toFixed(0)}K</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Probability:</Text>
                <Text style={styles.detailValue}>{opp.probability}%</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Contact:</Text>
                <Text style={styles.detailValue}>{opp.contact}</Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${opp.probability}%` }]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { backgroundColor: '#ec4899', padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#ffffff', opacity: 0.9, marginTop: 4 },
  opportunitiesSection: { padding: 16 },
  oppCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12 },
  oppHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  company: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  stageBadge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  stageText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  oppDetails: { gap: 8, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600' },
  value: { fontSize: 16, fontWeight: 'bold', color: '#10b981' },
  progressBar: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginTop: 8 },
  progressFill: { height: 6, backgroundColor: '#ec4899', borderRadius: 3 },
});

