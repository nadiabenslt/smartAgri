import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────
type Planting = {
  id: number;
  start_date: string;
  end_date: string | null;
  quantity: number;
  status: string;
  plante: { name: string; scientific_name: string; image: string | null } | null;
};

type Surface = {
  id: number;
  location: string;
  width: number;
  length: number;
  soil_type: string;
  created_at: string;
  plantings?: Planting[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const BASE_IP = '10.32.96.109';

const soilColors: Record<string, { bg: string; text: string; accent: string }> = {
  Clay:   { bg: '#FEF3C7', text: '#D97706', accent: '#F59E0B' },
  Sandy:  { bg: '#FEF9C3', text: '#CA8A04', accent: '#EAB308' },
  Loamy:  { bg: '#DCFCE7', text: '#16A34A', accent: '#48BB78' },
  Silty:  { bg: '#EDE9FE', text: '#7C3AED', accent: '#8B5CF6' },
  Peaty:  { bg: '#FEE2E2', text: '#DC2626', accent: '#EF4444' },
  Chalky: { bg: '#E0F2FE', text: '#0284C7', accent: '#0EA5E9' },
  Saline: { bg: '#F0FDFA', text: '#0F766E', accent: '#14B8A6' },
};

const getSoil = (s: string) => soilColors[s] ?? { bg: '#F3F4F6', text: '#6B7280', accent: '#9CA3AF' };

const calculateProgress = (start: string, end: string | null) => {
  if (!start || !end) return { progress: 0, daysLeft: '--' as string | number };
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const now = Date.now();
  if (now >= e) return { progress: 100, daysLeft: 0 };
  if (now <= s) return { progress: 0, daysLeft: Math.ceil((e - s) / 86400000) };
  return {
    progress: Math.round(((now - s) / (e - s)) * 100),
    daysLeft: Math.ceil((e - now) / 86400000),
  };
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function SurfaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [surface, setSurface] = useState<Surface | null>(null);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [surfRes, plantRes] = await Promise.all([
        api.get(`/surfaces/${id}`),
        api.get('/plantings'),
      ]);
      const s: Surface = surfRes.data.surface;
      const allPlantings: Planting[] = plantRes.data.plantings ?? [];
      setSurface(s);
      // filter plantings that belong to this surface
      setPlantings(allPlantings.filter((p: any) => p.surface_id === s.id));
    } catch {
      Alert.alert('Error', 'Could not load surface details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#48BB78" />
          <Text style={styles.loadingText}>Loading surface...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!surface) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}><Text style={styles.emptyText}>Surface not found.</Text></View>
      </SafeAreaView>
    );
  }

  const soil = getSoil(surface.soil_type);
  const area = (surface.width * surface.length).toFixed(1);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#2D3748" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Surface Details</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#48BB78" />}
      >
        {/* ── Hero card ── */}
        <View style={[styles.heroCard, { borderTopColor: soil.accent }]}>
          <View style={styles.heroTop}>
            <View style={[styles.soilIconBox, { backgroundColor: soil.bg }]}>
              <MaterialCommunityIcons name="shovel" size={28} color={soil.text} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroLocation}>{surface.location}</Text>
              <View style={[styles.soilBadge, { backgroundColor: soil.bg }]}>
                <Text style={[styles.soilBadgeText, { color: soil.text }]}>{surface.soil_type}</Text>
              </View>
            </View>
          </View>

          {/* Stats grid */}
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="resize-outline" size={18} color="#48BB78" />
              <Text style={styles.heroStatValue}>{surface.width} m</Text>
              <Text style={styles.heroStatLabel}>Width</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.heroStat}>
              <MaterialCommunityIcons name="arrow-expand-vertical" size={18} color="#48BB78" />
              <Text style={styles.heroStatValue}>{surface.length} m</Text>
              <Text style={styles.heroStatLabel}>Length</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.heroStat}>
              <MaterialCommunityIcons name="texture-box" size={18} color="#48BB78" />
              <Text style={styles.heroStatValue}>{area}</Text>
              <Text style={styles.heroStatLabel}>Area (m²)</Text>
            </View>
          </View>

          <Text style={styles.createdAt}>
            Created {new Date(surface.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Text>
        </View>

        {/* ── Plantings section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Plantings on this surface</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{plantings.length}</Text>
          </View>
        </View>

        {plantings.length === 0 ? (
          <View style={styles.emptyPlantings}>
            <Ionicons name="leaf-outline" size={48} color="#CBD5E0" />
            <Text style={styles.emptyText}>No plants added to this surface yet.</Text>
          </View>
        ) : (
          plantings.map((planting) => {
            const { progress, daysLeft } = calculateProgress(planting.start_date, planting.end_date);
            const imgUrl = planting.plante?.image
              ? `http://${BASE_IP}:8000/storage/${planting.plante.image}`
              : 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

            const statusColor =
              planting.status === 'active'   ? { bg: '#DCFCE7', text: '#166534' } :
              planting.status === 'completed' ? { bg: '#EDE9FE', text: '#7C3AED' } :
              { bg: '#FEF3C7', text: '#D97706' };

            return (
              <TouchableOpacity
                key={planting.id}
                style={styles.plantCard}
                onPress={() => router.push(`/plant-detail?id=${planting.id}`)}
                activeOpacity={0.88}
              >
                <Image source={{ uri: imgUrl }} style={styles.plantImage} />
                <View style={styles.plantBody}>
                  {/* Name + status */}
                  <View style={styles.plantTopRow}>
                    <Text style={styles.plantName}>{planting.plante?.name ?? 'Unknown Plant'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.statusText, { color: statusColor.text }]}>
                        {planting.status ?? 'pending'}
                      </Text>
                    </View>
                  </View>

                  {planting.plante?.scientific_name ? (
                    <Text style={styles.scientific}>{planting.plante.scientific_name}</Text>
                  ) : null}

                  {/* Progress */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                      <Text style={styles.progressLabel}>Growth Progress</Text>
                      <Text style={styles.progressPct}>{progress}%</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
                    </View>
                  </View>

                  {/* Date + days */}
                  <View style={styles.plantFooter}>
                    <View style={styles.footerItem}>
                      <Ionicons name="calendar-outline" size={13} color="#718096" />
                      <Text style={styles.footerText}>
                        {new Date(planting.start_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.footerItem}>
                      <Ionicons name="time-outline" size={13} color="#718096" />
                      <Text style={styles.footerText}>
                        {daysLeft !== '--' ? `${daysLeft} days left` : 'No end date'}
                      </Text>
                    </View>
                    <View style={styles.footerItem}>
                      <Ionicons name="chevron-forward" size={14} color="#A0AEC0" />
                      <Text style={styles.viewProgText}>View Programmes</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAF9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#718096', fontSize: 15 },

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

  // scroll
  container: { padding: 16, paddingBottom: 48 },

  // hero card
  heroCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20,
    borderWidth: 1, borderColor: '#E2E8F0', borderTopWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  soilIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroLocation: { fontSize: 20, fontWeight: '800', color: '#2D3748', marginBottom: 6 },
  soilBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  soilBadgeText: { fontSize: 12, fontWeight: '700' },
  heroStats: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#F7FAFC', borderRadius: 14, padding: 16, marginBottom: 14,
  },
  heroStat: { alignItems: 'center', gap: 4 },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: '#2D3748' },
  heroStatLabel: { fontSize: 11, color: '#A0AEC0', fontWeight: '600' },
  divider: { width: 1, backgroundColor: '#E2E8F0' },
  createdAt: { fontSize: 12, color: '#A0AEC0', textAlign: 'center' },

  // section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#2D3748' },
  countBadge: {
    backgroundColor: '#48BB78', width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  // empty
  emptyPlantings: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#A0AEC0', textAlign: 'center' },

  // plant cards
  plantCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  plantImage: { width: '100%', height: 130 },
  plantBody: { padding: 14, gap: 8 },
  plantTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plantName: { fontSize: 17, fontWeight: '700', color: '#2D3748', flex: 1, flexShrink: 1 },
  scientific: { fontSize: 12, color: '#A0AEC0', fontStyle: 'italic', marginTop: -4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  progressSection: { gap: 6 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: '#718096' },
  progressPct: { fontSize: 12, fontWeight: '700', color: '#48BB78' },
  progressBg: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: '#48BB78', borderRadius: 4 },
  plantFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 12, color: '#718096' },
  viewProgText: { fontSize: 12, color: '#A0AEC0' },
});
