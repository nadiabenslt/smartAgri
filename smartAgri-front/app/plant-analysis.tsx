import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';

type AnalysisResult = {
  disease_name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  treatments: string[];
  prevention: string[];
  confidence: number;
};

export default function PlantAnalysisScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: 'camera' | 'gallery' }>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [plantName, setPlantName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Launch camera or gallery based on the mode param on first mount
  React.useEffect(() => {
    if (mode === 'camera') {
      pickFromCamera();
    } else if (mode === 'gallery') {
      pickFromGallery();
    }
  }, []);

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery permission is required to upload photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const handleAnalyze = async () => {
    if (!description.trim() && !imageBase64) {
      Alert.alert('Required', 'Please provide a photo or describe the symptoms you see on your plant.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await api.post('/disease/analyze', {
        description: description.trim() || 'Please analyze this plant image.',
        plant_name: plantName.trim() || 'unknown plant',
        image: imageBase64,
      });

      if (response.data.success && response.data.disease) {
        router.push(`/disease-detail?id=${response.data.disease.id}`);
      } else {
        Alert.alert('Error', response.data.message || 'Analysis failed.');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      const msg = error.response?.data?.message || 'Failed to analyze. Please try again.';
      Alert.alert('Analysis Failed', msg);
    } finally {
      setLoading(false);
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return 'checkmark-circle';
      case 'medium': return 'warning';
      case 'high': return 'alert-circle';
      case 'critical': return 'skull';
      default: return 'help-circle';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1A202C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plant Analysis</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Section */}
          <View style={styles.imageSection}>
            {imageUri ? (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <View style={styles.imageActions}>
                  <TouchableOpacity style={styles.imageActionBtn} onPress={pickFromCamera}>
                    <Ionicons name="camera" size={18} color="#48BB78" />
                    <Text style={styles.imageActionText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageActionBtn} onPress={pickFromGallery}>
                    <Ionicons name="images" size={18} color="#48BB78" />
                    <Text style={styles.imageActionText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderCard}>
                <View style={styles.placeholderIcon}>
                  <MaterialCommunityIcons name="leaf-circle-outline" size={52} color="#48BB78" />
                </View>
                <Text style={styles.placeholderTitle}>Add a Photo</Text>
                <Text style={styles.placeholderSubtitle}>
                  Take or upload a photo of the affected plant
                </Text>
                <View style={styles.pickButtonsRow}>
                  <TouchableOpacity style={styles.pickButton} onPress={pickFromCamera}>
                    <Ionicons name="camera-outline" size={22} color="#FFF" />
                    <Text style={styles.pickButtonText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pickButton, styles.pickButtonOutline]} onPress={pickFromGallery}>
                    <Ionicons name="cloud-upload-outline" size={22} color="#48BB78" />
                    <Text style={[styles.pickButtonText, { color: '#48BB78' }]}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Describe the Problem</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plant Name (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Tomato, Rose, Wheat..."
                placeholderTextColor="#A0AEC0"
                value={plantName}
                onChangeText={setPlantName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Symptoms Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what you see: yellow spots, wilting leaves, brown edges, mold..."
                placeholderTextColor="#A0AEC0"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Analyze Button */}
            <TouchableOpacity
              style={[styles.analyzeButton, loading && { opacity: 0.7 }]}
              onPress={handleAnalyze}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFF" size="small" />
                  <Text style={styles.analyzeButtonText}>  Analyzing...</Text>
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons name="magnify" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.analyzeButtonText}>Analyze Plant</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Results Section */}
          {result && (
            <View style={styles.resultsSection}>
              <Text style={styles.sectionTitle}>Diagnosis Results</Text>

              {/* Disease Name & Severity */}
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.diseaseName}>{result.disease_name}</Text>
                    <Text style={styles.diseaseDesc}>{result.description}</Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(result.severity).bg }]}>
                    <Ionicons
                      name={getSeverityIcon(result.severity) as any}
                      size={14}
                      color={getSeverityColor(result.severity).text}
                    />
                    <Text style={[styles.severityText, { color: getSeverityColor(result.severity).text }]}>
                      {result.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Confidence */}
                <View style={styles.confidenceRow}>
                  <Text style={styles.confidenceLabel}>AI Confidence</Text>
                  <Text style={styles.confidenceValue}>{result.confidence}%</Text>
                </View>
                <View style={styles.confidenceBarBg}>
                  <View style={[styles.confidenceBarFill, { width: `${result.confidence}%` }]} />
                </View>
              </View>

              {/* Treatments */}
              <View style={styles.listCard}>
                <View style={styles.listHeader}>
                  <View style={[styles.listIconBox, { backgroundColor: '#DBEAFE' }]}>
                    <MaterialCommunityIcons name="medical-bag" size={18} color="#1D4ED8" />
                  </View>
                  <Text style={styles.listTitle}>Treatment Steps</Text>
                </View>
                {result.treatments.map((step, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.listItemText}>{step}</Text>
                  </View>
                ))}
              </View>

              {/* Prevention */}
              <View style={styles.listCard}>
                <View style={styles.listHeader}>
                  <View style={[styles.listIconBox, { backgroundColor: '#DCFCE7' }]}>
                    <MaterialCommunityIcons name="shield-check" size={18} color="#166534" />
                  </View>
                  <Text style={styles.listTitle}>Prevention Tips</Text>
                </View>
                {result.prevention.map((tip, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <Ionicons name="checkmark-circle" size={18} color="#48BB78" style={{ marginRight: 10 }} />
                    <Text style={styles.listItemText}>{tip}</Text>
                  </View>
                ))}
              </View>

              {/* Analyze Again */}
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => { setResult(null); setDescription(''); }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color="#48BB78" style={{ marginRight: 8 }} />
                <Text style={styles.retryButtonText}>Analyze Another Plant</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },

  container: {
    padding: 20,
    paddingBottom: 40,
  },

  // Image Section
  imageSection: {
    marginBottom: 24,
  },
  imageWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  imageActionText: {
    color: '#48BB78',
    fontWeight: '600',
    fontSize: 13,
  },

  // Placeholder
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  placeholderIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 6,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#48BB78',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#48BB78',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pickButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#48BB78',
    shadowOpacity: 0,
    elevation: 0,
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Form
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2D3748',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },

  // Analyze Button
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#48BB78',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: '#48BB78',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Results
  resultsSection: {
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 6,
  },
  diseaseDesc: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    marginRight: 12,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Confidence
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  confidenceValue: {
    fontSize: 12,
    color: '#2D3748',
    fontWeight: '700',
  },
  confidenceBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#48BB78',
    borderRadius: 3,
  },

  // List Cards
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  listIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A202C',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },

  // Retry
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FFF4',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#48BB78',
  },
  retryButtonText: {
    color: '#48BB78',
    fontSize: 15,
    fontWeight: '700',
  },
});
