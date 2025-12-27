// src/auth/logout.js
import { useRouter } from 'expo-router';
import { clearToken } from './token';

export const useLogout = () => {
  const router = useRouter();

  const logout = async () => {
    await clearToken();
    router.replace('/login');
  };

  return logout;
};