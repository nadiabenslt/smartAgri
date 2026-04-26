import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

export default function DiseaseFollowupScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const handleFollowup = async () => {
    if (!description.trim() && !imageBase64) {
      Alert.alert('Required', 'Please provide a photo or describe the current symptoms or condition of the plant.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/diseases/${id}/follow-up`, {
        description: description.trim() || 'Please evaluate this follow-up image.',
        image: imageBase64,
      });

      if (response.data.success) {
        if (response.data.resolved) {
            Alert.alert(
                'Treatment Successful', 
                response.data.assessment.assessment || 'Your plant has recovered!',
                [{ text: 'OK', onPress: () => router.replace(`/disease-detail?id=${id}`) }]
            );
        } else {
            Alert.alert(
                'New Treatment Required', 
                response.data.assessment.assessment || 'A new 7-day treatment plan has been generated.',
                [{ text: 'View New Plan', onPress: () => router.replace(`/disease-detail?id=${id}`) }]
            );
        }
      } else {
        Alert.alert('Error', response.data.message || 'Follow-up failed.');
      }
    } catch (error: any) {
      console.error('Follow-up error:', error);
      Alert.alert('Follow-up Failed', error.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1A202C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Follow-up Analysis</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.instructions}>
            Take a new photo and describe the current condition of your plant after the 7-day treatment.
          </Text>

          <View style={styles.imageSection}>
            {imageUri ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <View style={styles.imageActions}>
                  <TouchableOpacity style={styles.imageActionBtn} onPress={pickFromCamera}>
                    <Ionicons name="camera" size={18} color="#2563EB" />
                    <Text style={styles.imageActionText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageActionBtn} onPress={pickFromGallery}>
                    <Ionicons name="images" size={18} color="#2563EB" />
                    <Text style={styles.imageActionText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <View style={styles.placeholderIcon}>
                  <MaterialCommunityIcons name="camera-iris" size={48} color="#2563EB" />
                </View>
                <Text style={styles.placeholderTitle}>Current State</Text>
                <View style={styles.pickButtonsRow}>
                  <TouchableOpacity style={styles.pickButton} onPress={pickFromCamera}>
                    <Ionicons name="camera-outline" size={20} color="#FFF" />
                    <Text style={styles.pickButtonText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pickButton, styles.pickButtonOutline]} onPress={pickFromGallery}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#2563EB" />
                    <Text style={[styles.pickButtonText, { color: '#2563EB' }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Current Condition *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. The yellow spots have faded, but the leaves are still a bit droopy..."
              placeholderTextColor="#A0AEC0"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.analyzeButton, loading && { opacity: 0.7 }]}
              onPress={handleFollowup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.analyzeButtonText}>Submit Follow-up</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAF9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A202C' },
  container: { padding: 20, paddingBottom: 40 },
  instructions: { fontSize: 15, color: '#4A5568', marginBottom: 20, lineHeight: 22 },
  imageSection: { marginBottom: 24 },
  imageWrapper: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
  previewImage: { width: '100%', height: 250, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  imageActions: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 14 },
  imageActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  imageActionText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  placeholderCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  placeholderIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  placeholderTitle: { fontSize: 16, fontWeight: '700', color: '#2D3748', marginBottom: 20 },
  pickButtonsRow: { flexDirection: 'row', gap: 12 },
  pickButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14 },
  pickButtonOutline: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#2563EB' },
  pickButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  formSection: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '700', color: '#1A202C', marginBottom: 10 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#2D3748', borderWidth: 1, borderColor: '#E2E8F0' },
  textArea: { minHeight: 120, paddingTop: 14 },
  analyzeButton: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 16, marginTop: 20 },
  analyzeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
