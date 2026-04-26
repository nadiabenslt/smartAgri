import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../services/api';

type Programme = {
  id: number;
  day_number: number;
  date: string;
  recommendations: { title: string; tasks: string[] };
  status: 'pending' | 'done' | 'skipped';
};

type Disease = {
  id: number;
  name: string;
  plant_name: string;
  description: string;
  symptoms: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  treatments: string[];
  prevention: string[];
  detected_at: string;
  treated: boolean;
  analysis_status: 'active' | 'follow_up' | 'resolved';
  follow_up_date: string;
  programmes: Programme[];
};

export default function DiseaseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [disease, setDisease] = useState<Disease | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    fetchDisease();
  }, [id]);

  const fetchDisease = async () => {
    try {
      const response = await api.get(`/diseases/${id}`);
      if (response.data.success) {
        setDisease(response.data.disease);
      }
    } catch (error) {
      console.error('Failed to fetch disease:', error);
      Alert.alert('Error', 'Could not load disease details.');
    } finally {
      setLoading(false);
    }
  };

  const updateProgrammeStatus = async (progId: number, status: 'done' | 'skipped' | 'pending') => {
    setUpdatingId(progId);
    try {
      await api.patch(`/programmes/${progId}/status`, { status });
      setDisease(prev => {
        if (!prev) return prev;
        const newProgrammes = prev.programmes.map(p => 
          p.id === progId ? { ...p, status } : p
        );
        return { ...prev, programmes: newProgrammes };
      });
    } catch (error) {
      console.error('Failed to update status', error);
      Alert.alert('Error', 'Could not update programme status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return { bg: '#DCFCE7', text: '#166534' };
      case 'medium': return { bg: '#FEF9C3', text: '#854D0E' };
      case 'high': return { bg: '#FED7AA', text: '#C2410C' };
      case 'critical': return { bg: '#FECACA', text: '#991B1B' };
      default: return { bg: '#E2E8F0', text: '#475569' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#48BB78" />
      </View>
    );
  }

  if (!disease) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Disease not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#48BB78' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFollowUpDue = new Date() >= new Date(disease.follow_up_date);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A202C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disease Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Disease Info Card */}
        <View style={styles.card}>
          <View style={styles.diseaseHeader}>
            <View>
              <Text style={styles.diseaseName}>{disease.name}</Text>
              <Text style={styles.plantName}>on {disease.plant_name}</Text>
            </View>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(disease.severity).bg }]}>
              <Text style={[styles.severityText, { color: getSeverityColor(disease.severity).text }]}>
                {disease.severity.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.description}>{disease.description}</Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[styles.statusValue, disease.treated ? { color: '#48BB78' } : { color: '#D97706' }]}>
              {disease.treated ? 'Resolved' : disease.analysis_status === 'active' ? 'Under Treatment' : 'Needs Follow-up'}
            </Text>
          </View>
        </View>

        {/* Treatment Programme */}
        <Text style={styles.sectionTitle}>7-Day Treatment Programme</Text>
        {disease.programmes.length === 0 ? (
          <Text style={styles.emptyText}>No treatment programme found.</Text>
        ) : (
          disease.programmes.map((prog) => (
            <View key={prog.id} style={styles.progCard}>
              <View style={styles.progHeader}>
                <Text style={styles.progDay}>Day {prog.day_number}</Text>
                <Text style={styles.progDate}>{new Date(prog.date).toLocaleDateString()}</Text>
              </View>
              
              <Text style={styles.progTitle}>{prog.recommendations?.title}</Text>
              {prog.recommendations?.tasks?.map((task, idx) => (
                <View key={idx} style={styles.taskRow}>
                  <View style={styles.taskDot} />
                  <Text style={styles.taskText}>{task}</Text>
                </View>
              ))}

              {/* Status Actions */}
              <View style={styles.progActions}>
                {updatingId === prog.id ? (
                   <ActivityIndicator size="small" color="#48BB78" />
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.statusBtn, prog.status === 'done' && styles.statusBtnActiveDone]}
                      onPress={() => updateProgrammeStatus(prog.id, 'done')}
                    >
                      <Ionicons name="checkmark-circle" size={18} color={prog.status === 'done' ? '#FFF' : '#166534'} />
                      <Text style={[styles.statusBtnText, prog.status === 'done' && { color: '#FFF' }]}>Done</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.statusBtn, prog.status === 'skipped' && styles.statusBtnActiveSkipped]}
                      onPress={() => updateProgrammeStatus(prog.id, 'skipped')}
                    >
                      <Ionicons name="close-circle" size={18} color={prog.status === 'skipped' ? '#FFF' : '#991B1B'} />
                      <Text style={[styles.statusBtnText, prog.status === 'skipped' && { color: '#FFF' }]}>Skipped</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}

        {/* Follow-up Section */}
        {!disease.treated && (
          <View style={styles.followUpCard}>
            <View style={styles.followUpHeader}>
              <MaterialCommunityIcons name="camera-iris" size={24} color="#1D4ED8" />
              <Text style={styles.followUpTitle}>Follow-up Analysis</Text>
            </View>
            <Text style={styles.followUpDesc}>
              After completing the treatment period, take a new picture of your plant to let AI evaluate the progress and recommend the next steps.
            </Text>
            <Text style={styles.followUpDate}>
              Due Date: {new Date(disease.follow_up_date).toLocaleDateString()}
            </Text>
            <TouchableOpacity 
              style={[styles.followUpBtn, !isFollowUpDue && { opacity: 0.6 }]}
              onPress={() => router.push(`/disease-followup?id=${disease.id}`)}
              disabled={!isFollowUpDue}
            >
              <Text style={styles.followUpBtnText}>
                {isFollowUpDue ? "Start Follow-up Analysis" : "Follow-up not due yet"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAF9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A202C' },
  container: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0', elevation: 2 },
  diseaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  diseaseName: { fontSize: 20, fontWeight: '800', color: '#1A202C' },
  plantName: { fontSize: 14, color: '#718096', marginTop: 2 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  severityText: { fontSize: 11, fontWeight: '800' },
  description: { fontSize: 14, color: '#4A5568', lineHeight: 20, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusLabel: { fontSize: 14, fontWeight: '600', color: '#718096', marginRight: 6 },
  statusValue: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A202C', marginBottom: 16 },
  emptyText: { color: '#718096', textAlign: 'center', marginTop: 10 },
  progCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  progHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progDay: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
  progDate: { fontSize: 13, color: '#718096' },
  progTitle: { fontSize: 14, fontWeight: '600', color: '#4A5568', marginBottom: 10 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  taskDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#48BB78', marginTop: 7, marginRight: 8 },
  taskText: { flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 18 },
  progActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F0F4F8', gap: 4 },
  statusBtnText: { fontSize: 13, fontWeight: '600', color: '#4A5568' },
  statusBtnActiveDone: { backgroundColor: '#48BB78' },
  statusBtnActiveSkipped: { backgroundColor: '#EF4444' },
  followUpCard: { backgroundColor: '#DBEAFE', borderRadius: 20, padding: 20, marginTop: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  followUpHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  followUpTitle: { fontSize: 18, fontWeight: '700', color: '#1E3A8A' },
  followUpDesc: { fontSize: 14, color: '#1E3A8A', lineHeight: 20, marginBottom: 12 },
  followUpDate: { fontSize: 13, fontWeight: '600', color: '#1E40AF', marginBottom: 16 },
  followUpBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  followUpBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' }
});
