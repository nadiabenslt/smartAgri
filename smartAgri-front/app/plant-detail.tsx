import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────
type Recommendation = { type: string; description: string };

type Programme = {
  id: number;
  day_number: number;
  date: string;
  weather_summary: string | null;
  recommendations: Recommendation[];
  status: 'pending' | 'done' | 'skipped';
};

type Planting = {
  id: number;
  start_date: string;
  end_date: string | null;
  quantity: number;
  status: string;
  plante: { name: string; scientific_name: string; image: string | null } | null;
  surface: { location: string; soil_type: string } | null;
  programmes: Programme[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const BASE_IP = '10.32.96.109';

const recommendationIcon: Record<string, { name: any; color: string; bg: string }> = {
  watering:    { name: 'water-outline',      color: '#0369A1', bg: '#BAE6FD' },
  fertilizing: { name: 'leaf-outline',       color: '#166534', bg: '#BBF7D0' },
  observation: { name: 'eye-outline',        color: '#7C3AED', bg: '#EDE9FE' },
};

const statusConfig = {
  pending: { label: 'Pending',  color: '#D97706', bg: '#FEF3C7', icon: 'time-outline' as any },
  done:    { label: 'Done',     color: '#166534', bg: '#DCFCE7', icon: 'checkmark-circle-outline' as any },
  skipped: { label: 'Skipped', color: '#6B7280', bg: '#F3F4F6', icon: 'close-circle-outline' as any },
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [planting, setPlanting] = useState<Planting | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // ── Fetch planting detail ────────────────────────────────────────────────
  const fetchPlanting = useCallback(async () => {
    try {
      const res = await api.get(`/plantings/${id}`);
      setPlanting(res.data.planting);
    } catch (err) {
      console.error('Error fetching planting:', err);
      Alert.alert('Error', 'Could not load plant details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchPlanting(); }, [fetchPlanting]);

  const onRefresh = () => { setRefreshing(true); fetchPlanting(); };

  // ── Update programme status ──────────────────────────────────────────────
  const updateStatus = async (
    programme: Programme,
    newStatus: 'pending' | 'done' | 'skipped'
  ) => {
    if (programme.status === newStatus) return;
    setUpdatingId(programme.id);
    try {
      await api.patch(`/programmes/${programme.id}/status`, { status: newStatus });
      setPlanting((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          programmes: prev.programmes.map((p) =>
            p.id === programme.id ? { ...p, status: newStatus } : p
          ),
        };
      });
    } catch (err) {
      Alert.alert('Error', 'Could not update programme status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Progress ─────────────────────────────────────────────────────────────
  const calculateProgress = () => {
    if (!planting?.start_date || !planting?.end_date) return { progress: 0, daysLeft: '--' };
    const start = new Date(planting.start_date).getTime();
    const end   = new Date(planting.end_date).getTime();
    const now   = Date.now();
    if (now >= end)  return { progress: 100, daysLeft: 0 };
    if (now <= start) return { progress: 0, daysLeft: Math.ceil((end - start) / 86400000) };
    return {
      progress: Math.round(((now - start) / (end - start)) * 100),
      daysLeft: Math.ceil((end - now) / 86400000),
    };
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const programmeStats = () => {
    if (!planting) return { done: 0, pending: 0, skipped: 0, total: 0 };
    const programmes = planting.programmes;
    return {
      done:    programmes.filter((p) => p.status === 'done').length,
      pending: programmes.filter((p) => p.status === 'pending').length,
      skipped: programmes.filter((p) => p.status === 'skipped').length,
      total:   programmes.length,
    };
  };

  // ── Image URL ────────────────────────────────────────────────────────────
  const imageUrl = planting?.plante?.image
    ? `http://${BASE_IP}:8000/storage/${planting.plante.image}`
    : 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#48BB78" />
          <Text style={styles.loadingText}>Loading plant details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!planting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Plant not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { progress, daysLeft } = calculateProgress();
  const stats = programmeStats();

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Plant Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#48BB78" />}
      >
        {/* ── Hero image ── */}
        <View style={styles.heroCard}>
          <Image source={{ uri: imageUrl }} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>{planting.plante?.name || 'Unknown Plant'}</Text>
            {planting.plante?.scientific_name ? (
              <Text style={styles.heroSubtitle}>{planting.plante.scientific_name}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Info cards row ── */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Ionicons name="location-outline" size={18} color="#48BB78" />
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{planting.surface?.location || '—'}</Text>
          </View>
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="shovel" size={18} color="#48BB78" />
            <Text style={styles.infoLabel}>Soil Type</Text>
            <Text style={styles.infoValue}>{planting.surface?.soil_type || '—'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Ionicons name="layers-outline" size={18} color="#48BB78" />
            <Text style={styles.infoLabel}>Quantity</Text>
            <Text style={styles.infoValue}>{planting.quantity}</Text>
          </View>
        </View>

        {/* ── Growth progress ── */}
        <View style={styles.section}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Growth Progress</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress}%` as any }]} />
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={14} color="#718096" />
              <Text style={styles.dateText}>
                Start: {new Date(planting.start_date).toLocaleDateString()}
              </Text>
            </View>
            {planting.end_date && (
              <View style={styles.dateItem}>
                <MaterialCommunityIcons name="calendar-check-outline" size={14} color="#718096" />
                <Text style={styles.dateText}>
                  End: {new Date(planting.end_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
          {daysLeft !== '--' && (
            <View style={styles.daysLeftBadge}>
              <Ionicons name="time-outline" size={14} color="#166534" />
              <Text style={styles.daysLeftText}>{daysLeft} days to harvest</Text>
            </View>
          )}
        </View>

        {/* ── Programme stats ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: '#BBF7D0' }]}>
            <Text style={[styles.statNumber, { color: '#166534' }]}>{stats.done}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#FEF3C7' }]}>
            <Text style={[styles.statNumber, { color: '#D97706' }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#F3F4F6' }]}>
            <Text style={[styles.statNumber, { color: '#6B7280' }]}>{stats.skipped}</Text>
            <Text style={styles.statLabel}>Skipped</Text>
          </View>
          <View style={[styles.statCard, { borderColor: '#E2E8F0' }]}>
            <Text style={[styles.statNumber, { color: '#2D3748' }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* ── Programmes list ── */}
        <Text style={styles.sectionTitle}>Daily Programmes</Text>

        {planting.programmes.length === 0 ? (
          <View style={styles.emptyProgrammes}>
            <Ionicons name="calendar-outline" size={48} color="#CBD5E0" />
            <Text style={styles.emptyText}>No programmes available yet.</Text>
          </View>
        ) : (
          planting.programmes
            .slice()
            .sort((a, b) => a.day_number - b.day_number)
            .map((prog) => {
              const cfg = statusConfig[prog.status];
              const isExpanded = expandedDay === prog.id;

              return (
                <View key={prog.id} style={styles.programmeCard}>
                  {/* ── Card header (always visible) ── */}
                  <TouchableOpacity
                    style={styles.programmeHeader}
                    onPress={() => setExpandedDay(isExpanded ? null : prog.id)}
                    activeOpacity={0.8}
                  >
                    {/* Day badge */}
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>Day</Text>
                      <Text style={styles.dayBadgeNumber}>{prog.day_number}</Text>
                    </View>

                    {/* Date + weather */}
                    <View style={styles.programmeMeta}>
                      <Text style={styles.programmeDate}>
                        {new Date(prog.date).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })}
                      </Text>
                      {prog.weather_summary ? (
                        <Text style={styles.weatherSummary} numberOfLines={1}>
                          🌤 {prog.weather_summary}
                        </Text>
                      ) : null}
                    </View>

                    {/* Status badge */}
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>

                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#A0AEC0"
                    />
                  </TouchableOpacity>

                  {/* ── Expanded body ── */}
                  {isExpanded && (
                    <View style={styles.programmeBody}>
                      {/* Recommendations */}
                      {prog.recommendations.map((rec, idx) => {
                        const ic = recommendationIcon[rec.type] ?? {
                          name: 'information-circle-outline',
                          color: '#4A5568',
                          bg: '#EDF2F7',
                        };
                        return (
                          <View key={idx} style={styles.recRow}>
                            <View style={[styles.recIconBox, { backgroundColor: ic.bg }]}>
                              <Ionicons name={ic.name} size={16} color={ic.color} />
                            </View>
                            <View style={styles.recContent}>
                              <Text style={styles.recType}>{rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}</Text>
                              <Text style={styles.recDesc}>{rec.description}</Text>
                            </View>
                          </View>
                        );
                      })}

                      {/* ── Action buttons ── */}
                      <View style={styles.actionRow}>
                        {updatingId === prog.id ? (
                          <ActivityIndicator size="small" color="#48BB78" style={{ marginTop: 8 }} />
                        ) : (
                          <>
                            {/* Done */}
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                prog.status === 'done'
                                  ? styles.actionBtnDoneActive
                                  : styles.actionBtnDone,
                              ]}
                              onPress={() => updateStatus(prog, 'done')}
                              disabled={prog.status === 'done'}
                            >
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={16}
                                color={prog.status === 'done' ? '#FFFFFF' : '#166534'}
                              />
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  { color: prog.status === 'done' ? '#FFFFFF' : '#166534' },
                                ]}
                              >
                                Done
                              </Text>
                            </TouchableOpacity>

                            {/* Skipped */}
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                prog.status === 'skipped'
                                  ? styles.actionBtnSkippedActive
                                  : styles.actionBtnSkipped,
                              ]}
                              onPress={() => updateStatus(prog, 'skipped')}
                              disabled={prog.status === 'skipped'}
                            >
                              <Ionicons
                                name="close-circle-outline"
                                size={16}
                                color={prog.status === 'skipped' ? '#FFFFFF' : '#6B7280'}
                              />
                              <Text
                                style={[
                                  styles.actionBtnText,
                                  { color: prog.status === 'skipped' ? '#FFFFFF' : '#6B7280' },
                                ]}
                              >
                                Skip
                              </Text>
                            </TouchableOpacity>

                            {/* Reset to pending (only if done or skipped) */}
                            {prog.status !== 'pending' && (
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBtnPending]}
                                onPress={() => updateStatus(prog, 'pending')}
                              >
                                <Ionicons name="refresh-outline" size={16} color="#D97706" />
                                <Text style={[styles.actionBtnText, { color: '#D97706' }]}>Reset</Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAF9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#718096', fontSize: 15 },

  // top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: '#2D3748' },

  // scrollable body
  container: { padding: 16, paddingBottom: 48 },

  // hero
  heroCard: {
    borderRadius: 24, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#48BB78', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 5,
  },
  heroImage: { width: '100%', height: 200 },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
    background: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', marginTop: 2 },

  // info row
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  infoCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  infoLabel: { fontSize: 10, color: '#A0AEC0', fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 13, color: '#2D3748', fontWeight: '700', textAlign: 'center' },

  // section
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2D3748', marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressPercent: { fontSize: 14, fontWeight: '700', color: '#48BB78' },
  progressBarBg: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5 },
  progressBarFill: { height: '100%', backgroundColor: '#48BB78', borderRadius: 5 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 12, color: '#718096' },
  daysLeftBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: '#DCFCE7', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  daysLeftText: { fontSize: 13, color: '#166534', fontWeight: '600' },

  // stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 12, alignItems: 'center', borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  statNumber: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#A0AEC0', fontWeight: '600', marginTop: 2 },

  // programme cards
  programmeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  programmeHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10,
  },
  dayBadge: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F0FFF4', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#9AE6B4',
  },
  dayBadgeText: { fontSize: 9, color: '#48BB78', fontWeight: '600', textTransform: 'uppercase' },
  dayBadgeNumber: { fontSize: 16, color: '#276749', fontWeight: '800' },
  programmeMeta: { flex: 1 },
  programmeDate: { fontSize: 14, fontWeight: '600', color: '#2D3748' },
  weatherSummary: { fontSize: 11, color: '#718096', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  // expanded body
  programmeBody: {
    borderTopWidth: 1, borderTopColor: '#F7FAFC', padding: 14, gap: 10,
    backgroundColor: '#FAFAF9',
  },
  recRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  recIconBox: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  recContent: { flex: 1 },
  recType: { fontSize: 12, fontWeight: '700', color: '#4A5568', textTransform: 'capitalize' },
  recDesc: { fontSize: 13, color: '#718096', marginTop: 2, lineHeight: 18 },

  // action buttons
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  actionBtnDone: { borderColor: '#9AE6B4', backgroundColor: '#F0FFF4' },
  actionBtnDoneActive: { borderColor: '#48BB78', backgroundColor: '#48BB78' },
  actionBtnSkipped: { borderColor: '#CBD5E0', backgroundColor: '#F7FAFC' },
  actionBtnSkippedActive: { borderColor: '#6B7280', backgroundColor: '#6B7280' },
  actionBtnPending: { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' },

  // empty state
  emptyProgrammes: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: '#A0AEC0', fontSize: 15 },
});
