import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// 1. Get Token (Platform Safe)
export async function getToken() {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  } else {
    return await SecureStore.getItemAsync('auth_token');
  }
}

// 2. Save Token (Platform Safe)
export async function setToken(token) {
  if (Platform.OS === 'web') {
    localStorage.setItem('auth_token', token);
  } else {
    await SecureStore.setItemAsync('auth_token', token);
  }
}

// 3. Delete Token (Platform Safe)
export async function deleteToken() {
  if (Platform.OS === 'web') {
    localStorage.removeItem('auth_token');
  } else {
    await SecureStore.deleteItemAsync('auth_token');
  }
}