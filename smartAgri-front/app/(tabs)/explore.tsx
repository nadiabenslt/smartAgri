import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';

// ─── Types ──────────────────────────────────────────────────────────────────
type Surface = {
  id: number;
  location: string;
  width: number;
  length: number;
  soil_type: string;
  created_at: string;
};

type FormState = {
  location: string;
  width: string;
  length: string;
  soil_type: string;
};

const SOIL_TYPES = [
  { value: 'clay',   label: 'Clay' },
  { value: 'sandy',  label: 'Sandy' },
  { value: 'loamy',  label: 'Loamy' },
  { value: 'silty',  label: 'Silty' },
  { value: 'peaty',  label: 'Peaty' },
  { value: 'chalky', label: 'Chalky' },
  { value: 'other',  label: 'Other' },
];

const soilColors: Record<string, { bg: string; text: string }> = {
  clay:   { bg: '#FEF3C7', text: '#D97706' },
  sandy:  { bg: '#FEF9C3', text: '#CA8A04' },
  loamy:  { bg: '#DCFCE7', text: '#16A34A' },
  silty:  { bg: '#EDE9FE', text: '#7C3AED' },
  peaty:  { bg: '#FEE2E2', text: '#DC2626' },
  chalky: { bg: '#E0F2FE', text: '#0284C7' },
  other:  { bg: '#F0FDFA', text: '#0F766E' },
};

const getSoilColor = (soil: string) =>
  soilColors[soil.toLowerCase()] ?? { bg: '#F3F4F6', text: '#6B7280' };

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Component ──────────────────────────────────────────────────────────────
export default function SurfacesScreen() {
  const router = useRouter();
  const [surfaces, setSurfaces] = useState<Surface[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Surface | null>(null);
  const [form, setForm] = useState<FormState>({ location: '', width: '', length: '', soil_type: 'loamy' });
  const [saving, setSaving] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchSurfaces = useCallback(async () => {
    try {
      const res = await api.get('/surfaces');
      setSurfaces(res.data.surfaces ?? []);
    } catch {
      Alert.alert('Error', 'Could not load surfaces.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSurfaces(); }, [fetchSurfaces]);
  const onRefresh = () => { setRefreshing(true); fetchSurfaces(); };

  // ── Open modal ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm({ location: '', width: '', length: '', soil_type: 'loamy' });
    setModalVisible(true);
  };

  const openEdit = (s: Surface) => {
    setEditTarget(s);
    setForm({
      location: s.location,
      width:    String(s.width),
      length:   String(s.length),
      soil_type: s.soil_type,
    });
    setModalVisible(true);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.location.trim()) { Alert.alert('Validation', 'Location is required.'); return; }
    if (!form.width || isNaN(Number(form.width))) { Alert.alert('Validation', 'Width must be a number.'); return; }
    if (!form.length || isNaN(Number(form.length))) { Alert.alert('Validation', 'Length must be a number.'); return; }

    setSaving(true);
    try {
      const payload = {
        location:  form.location.trim(),
        width:     parseFloat(form.width),
        length:    parseFloat(form.length),
        soil_type: form.soil_type,
      };

      if (editTarget) {
        await api.put(`/surfaces/${editTarget.id}`, payload);
      } else {
        await api.post('/surfaces', payload);
      }

      setModalVisible(false);
      fetchSurfaces();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Could not save surface.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (s: Surface) => {
    Alert.alert(
      'Delete Surface',
      `Are you sure you want to delete "${s.location}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/surfaces/${s.id}`);
              setSurfaces((prev) => prev.filter((x) => x.id !== s.id));
            } catch {
              Alert.alert('Error', 'Could not delete surface.');
            }
          },
        },
      ]
    );
  };

  // ── Area helper ───────────────────────────────────────────────────────────
  const area = (s: Surface) => (s.width * s.length).toFixed(1);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Surfaces</Text>
          <Text style={styles.headerSub}>{surfaces.length} field{surfaces.length !== 1 ? 's' : ''} registered</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#48BB78" />
        </View>
      ) : surfaces.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={56} color="#CBD5E0" />
          <Text style={styles.emptyTitle}>No surfaces yet</Text>
          <Text style={styles.emptySubtitle}>Tap "Add" to register your first field.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#48BB78" />}
        >
          {surfaces.map((s) => {
            const soil = getSoilColor(s.soil_type);
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.card}
                onPress={() => router.push(`/surface-detail?id=${s.id}`)}
                activeOpacity={0.88}
              >
                {/* Left accent */}
                <View style={[styles.cardAccent, { backgroundColor: soil.text }]} />

                <View style={styles.cardBody}>
                  {/* Top row */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={16} color="#48BB78" />
                      <Text style={styles.locationText}>{s.location}</Text>
                    </View>
                    <View style={[styles.soilBadge, { backgroundColor: soil.bg }]}>
                      <Text style={[styles.soilText, { color: soil.text }]}>{capitalize(s.soil_type)}</Text>
                    </View>
                  </View>

                  {/* Stats row */}
                  <View style={styles.statsRow}>
                    <View style={styles.stat}>
                      <Ionicons name="resize-outline" size={14} color="#718096" />
                      <Text style={styles.statLabel}>{s.width} m × {s.length} m</Text>
                    </View>
                    <View style={styles.stat}>
                      <MaterialCommunityIcons name="texture-box" size={14} color="#718096" />
                      <Text style={styles.statLabel}>{area(s)} m²</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(s)}>
                      <Ionicons name="pencil-outline" size={14} color="#48BB78" />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(s)}>
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <View style={styles.detailHint}>
                      <Text style={styles.detailHintText}>View Plantings</Text>
                      <Ionicons name="chevron-forward" size={14} color="#A0AEC0" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Surface' : 'New Surface'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Location */}
              <Text style={styles.fieldLabel}>Location / Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. North Field"
                placeholderTextColor="#A0AEC0"
                value={form.location}
                onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
              />

              {/* Width & Length */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Width (m)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#A0AEC0"
                    keyboardType="decimal-pad"
                    value={form.width}
                    onChangeText={(v) => setForm((f) => ({ ...f, width: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Length (m)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#A0AEC0"
                    keyboardType="decimal-pad"
                    value={form.length}
                    onChangeText={(v) => setForm((f) => ({ ...f, length: v }))}
                  />
                </View>
              </View>

              {/* Area preview */}
              {form.width && form.length && !isNaN(Number(form.width)) && !isNaN(Number(form.length)) && (
                <View style={styles.areaPreview}>
                  <MaterialCommunityIcons name="texture-box" size={16} color="#48BB78" />
                  <Text style={styles.areaPreviewText}>
                    Total area: {(parseFloat(form.width) * parseFloat(form.length)).toFixed(1)} m²
                  </Text>
                </View>
              )}

              {/* Soil type selector */}
              <Text style={styles.fieldLabel}>Soil Type</Text>
              <View style={styles.soilGrid}>
                {SOIL_TYPES.map((soil) => {
                  const active = form.soil_type === soil.value;
                  const colors = getSoilColor(soil.value);
                  return (
                    <TouchableOpacity
                      key={soil.value}
                      style={[
                        styles.soilChip,
                        {
                          backgroundColor: active ? colors.text : colors.bg,
                          borderColor: colors.text,
                        },
                      ]}
                      onPress={() => setForm((f) => ({ ...f, soil_type: soil.value }))}
                    >
                      <Text style={[styles.soilChipText, { color: active ? '#FFF' : colors.text }]}>
                        {soil.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Save button */}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name={editTarget ? 'save-outline' : 'add-circle-outline'} size={18} color="#FFF" />
                    <Text style={styles.saveBtnText}>{editTarget ? 'Save Changes' : 'Add Surface'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAF9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#4A5568' },
  emptySubtitle: { fontSize: 14, color: '#A0AEC0', textAlign: 'center', paddingHorizontal: 40 },

  // header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#2D3748' },
  headerSub: { fontSize: 13, color: '#718096', marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#48BB78', paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 20,
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // list
  list: { padding: 16, gap: 14, paddingBottom: 40 },

  // card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: 16, gap: 10 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  locationText: { fontSize: 16, fontWeight: '700', color: '#2D3748', flexShrink: 1 },
  soilBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  soilText: { fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 18 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { fontSize: 13, color: '#718096' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#9AE6B4',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  editBtnText: { fontSize: 12, color: '#48BB78', fontWeight: '600' },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  deleteBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  detailHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailHintText: { fontSize: 12, color: '#A0AEC0' },

  // modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 36, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#2D3748' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#4A5568', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#F7FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#2D3748',
  },
  rowInputs: { flexDirection: 'row', gap: 12 },
  areaPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
    backgroundColor: '#F0FFF4', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14,
  },
  areaPreviewText: { fontSize: 13, color: '#166534', fontWeight: '600' },
  soilGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  soilChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  soilChipText: { fontSize: 13, fontWeight: '600' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#48BB78', borderRadius: 16, paddingVertical: 15, marginTop: 24,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
