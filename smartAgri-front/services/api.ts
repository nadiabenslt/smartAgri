import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// NOTE: Replace '192.168.1.100' with your actual local IP address
// You can find your local IP by running `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
const LOCAL_IP = '192.168.3.139'; // Updated IP
const BASE_URL = Platform.OS === 'web' ? 'http://127.0.0.1:8000/api' : `http://${LOCAL_IP}:8000/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add a request interceptor to attach the auth token automatically
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from storage', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
