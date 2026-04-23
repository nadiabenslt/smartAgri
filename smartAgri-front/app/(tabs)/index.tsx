import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import api from '../../services/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const [weatherData, setWeatherData] = useState<{
    temp: number;
    humidity: number;
    rainProb: number;
  } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  // ── Store coordinates so they can be passed to the planting API ──────────
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number }>({
    lat: 36.7525, // Default to Algiers
    lon: 3.0420,
  });

  const [plantings, setPlantings] = useState<any[]>([]);
  const [loadingPlantings, setLoadingPlantings] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        let lat = 36.7525;
        let lon = 3.0420;

        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          lat = location.coords.latitude;
          lon = location.coords.longitude;
        }

        // ── Save coords to state for reuse in createPlanting() ─────────────
        setUserCoords({ lat, lon });

        const apiKey = '6be10b80e9b39296205e4eb7d9451ff3';
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
        );
        const data = await response.json();

        if (data && data.list && data.list.length > 0) {
          const current = data.list[0];
          setWeatherData({
            temp: Math.round(current.main.temp),
            humidity: Math.round(current.main.humidity),
            rainProb: Math.round(current.pop * 100),
          });
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoadingWeather(false);
      }
    })();

    // Fetch plantings
    (async () => {
      try {
        const response = await api.get('/plantings');
        if (response.data && response.data.plantings) {
          setPlantings(response.data.plantings);
        }
      } catch (error) {
        console.error('Error fetching plantings:', error);
      } finally {
        setLoadingPlantings(false);
      }
    })();
  }, []);

  /**
   * Call this when submitting the "Add Plant" form.
   * Attaches the user's current lat/lon so the backend can fetch
   * a weather-aware programme from OpenWeatherMap.
   *
   * @param payload  - the rest of the planting form fields
   */
  const createPlanting = async (payload: {
    surface_id: number;
    plante_id: number;
    quantity: number;
    start_date: string;
    status?: string;
  }) => {
    const response = await api.post('/plantings', {
      ...payload,
      lat: userCoords.lat,  // ← injected automatically from device location
      lon: userCoords.lon,  // ← injected automatically from device location
    });
    return response.data;
  };

  const calculateProgress = (startStr: string, endStr: string | null) => {
    if (!startStr || !endStr) return { progress: 0, daysLeft: '--' };
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const now = new Date().getTime();

    if (now >= end) return { progress: 100, daysLeft: 0 };
    if (now <= start) return { progress: 0, daysLeft: Math.ceil((end - start) / 86400000) };

    const progress = Math.round(((now - start) / (end - start)) * 100);
    const daysLeft = Math.ceil((end - now) / 86400000);
    return { progress, daysLeft };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header Section */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/SmartAgri.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Weather Widgets */}
        <View style={styles.weatherContainer}>
          <View style={styles.weatherRow}>
            {/* Temperature */}
            <View style={styles.weatherCard}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF08A' }]}>
                <Ionicons name="thermometer-outline" size={20} color="#CA8A04" />
              </View>
              <View style={styles.weatherTextContainer}>
                <Text style={styles.weatherLabel}>Temperature</Text>
                {loadingWeather ? (
                  <ActivityIndicator size="small" color="#CA8A04" style={{ marginTop: 2 }} />
                ) : (
                  <Text style={styles.weatherValue}>{weatherData?.temp ?? '--'}°C</Text>
                )}
              </View>
            </View>

            {/* Humidity */}
            <View style={styles.weatherCard}>
              <View style={[styles.iconBox, { backgroundColor: '#BBF7D0' }]}>
                <Ionicons name="water-outline" size={20} color="#166534" />
              </View>
              <View style={styles.weatherTextContainer}>
                <Text style={styles.weatherLabel}>Humidity</Text>
                {loadingWeather ? (
                  <ActivityIndicator size="small" color="#166534" style={{ marginTop: 2 }} />
                ) : (
                  <Text style={styles.weatherValue}>{weatherData?.humidity ?? '--'}%</Text>
                )}
              </View>
            </View>
          </View>

          {/* Rain Forecast */}
          <View style={[styles.weatherCard, styles.weatherCardFull]}>
            <View style={[styles.iconBox, { backgroundColor: '#BAE6FD' }]}>
              <Ionicons name="rainy-outline" size={20} color="#0369A1" />
            </View>
            <View style={styles.weatherTextContainer}>
              <Text style={styles.weatherLabel}>Rain Forecast</Text>
              {loadingWeather ? (
                <ActivityIndicator size="small" color="#0369A1" style={{ marginTop: 2 }} />
              ) : (
                <Text style={styles.weatherValue}>{weatherData?.rainProb ?? '--'}%</Text>
              )}
            </View>
          </View>
        </View>

        {/* AI Plant Analysis */}
        <View style={styles.aiSection}>
          <Text style={styles.aiTitle}>Is there a problem or disease with your plant?</Text>
          <Text style={styles.aiSubtitle}>You can upload a picture for us to analyze.</Text>
          <View style={styles.aiButtonsRow}>
            <TouchableOpacity style={styles.outlineButton}>
              <Ionicons name="camera-outline" size={20} color="#48BB78" style={styles.btnIcon} />
              <Text style={styles.outlineButtonText}>Capture Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton}>
              <Ionicons name="cloud-upload-outline" size={20} color="#48BB78" style={styles.btnIcon} />
              <Text style={styles.outlineButtonText}>Upload Image</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Plants Section */}
        <View style={styles.plantsHeader}>
          <Text style={styles.plantsTitle}>My Plants: {plantings.length}</Text>
          {/* Pass createPlanting to your Add Plant modal/screen */}
          <TouchableOpacity style={styles.addPlantBtn}>
            <Ionicons name="add" size={18} color="#FFF" />
            <Text style={styles.addPlantBtnText}>Add Plant</Text>
          </TouchableOpacity>
        </View>

        {/* Plant Cards List */}
        {loadingPlantings ? (
          <ActivityIndicator size="large" color="#48BB78" style={{ marginTop: 20 }} />
        ) : plantings.length === 0 ? (
          <Text style={styles.emptyText}>You haven't added any plants yet.</Text>
        ) : (
          plantings.map((planting) => {
            const { progress, daysLeft } = calculateProgress(planting.start_date, planting.end_date);
            const imageUrl = planting.plante?.image
              ? `http://10.32.96.122:8000/storage/${planting.plante.image}`
              : 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

            return (
              <View style={styles.plantCard} key={planting.id}>
                <Image source={{ uri: imageUrl }} style={styles.plantImage} />
                <View style={styles.plantInfo}>
                  <View style={styles.plantTitleRow}>
                    <Text style={styles.plantTitle}>{planting.plante?.name || 'Unknown Plant'}</Text>
                    <Text style={styles.plantSubtitle}>{planting.surface?.location || 'Garden Bed'}</Text>
                  </View>

                  <View style={styles.progressContainer}>
                    <Text style={styles.progressLabel}>Growth Progress</Text>
                    <Text style={styles.progressValue}>{progress}%</Text>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                  </View>

                  <View style={styles.harvestRow}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#718096" />
                    <Text style={styles.harvestText}>{daysLeft} Days to Harvest</Text>
                  </View>

                  <TouchableOpacity style={styles.irrigationButton}>
                    <Text style={styles.irrigationText}>Next Irrigation: Tomorrow</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logo: {
    width: 220,
    height: 50,
  },
  weatherContainer: {
    marginBottom: 32,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  weatherCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  weatherCardFull: {
    alignSelf: 'center',
    paddingHorizontal: 30,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  weatherTextContainer: {
    alignItems: 'flex-start',
  },
  weatherLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  weatherValue: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: 'bold',
    marginTop: 2,
  },
  aiSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  aiTitle: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  aiSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16,
    textAlign: 'center',
  },
  aiButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#48BB78',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  btnIcon: {
    marginRight: 8,
  },
  outlineButtonText: {
    color: '#48BB78',
    fontWeight: '600',
    fontSize: 14,
  },
  plantsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  plantsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  emptyText: {
    textAlign: 'center',
    color: '#718096',
    marginTop: 20,
    fontSize: 16,
  },
  addPlantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#48BB78',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  addPlantBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 14,
  },
  plantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#48BB78',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  plantImage: {
    width: '100%',
    height: 160,
  },
  plantInfo: {
    padding: 20,
  },
  plantTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  plantTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  plantSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  progressContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  progressLabel: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'left',
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 12,
    color: '#2D3748',
    fontWeight: '600',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    flexDirection: 'row',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#48BB78',
    borderRadius: 4,
  },
  harvestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  harvestText: {
    color: '#718096',
    fontSize: 14,
    marginLeft: 6,
  },
  irrigationButton: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  irrigationText: {
    color: '#166534',
    fontWeight: '600',
    fontSize: 15,
  },
});
