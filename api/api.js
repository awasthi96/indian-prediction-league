// src/api/api.js
import { API_BASE_URL } from '../config';
import { getToken } from '../auth/token';

export const apiRequest = async (path, options = {}) => {
  const token = await getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Response has no body
  }

  if (!res.ok) {
    const msg =
      Array.isArray(data?.detail)
        ? data.detail[0]?.msg
        : data?.detail || `Error ${res.status}`;
    
    throw {
      status: res.status,
      message: msg,
      data,
    };
  }

  return data;
};

export const api = {
  health: () => apiRequest("/health"),

  login: (username, password) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getUpcomingMatches: () => apiRequest("/matches/matches?status=upcoming"),

  getCompletedMatches: () => apiRequest("/matches/matches?status=completed"),

  getMatch: (matchId) => apiRequest(`/matches/${matchId}`),

  getMatchPlayers: (matchId) => apiRequest(`/matches/${matchId}/players`),

  submitPrediction: (matchId, payload) =>
    apiRequest(`/predictions/${matchId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getMyPrediction: (matchId) =>
    apiRequest(`/predictions/${matchId}/me`),
    
  getOverallLeaderboard: () => apiRequest("/leaderboard/overall"),

  getXFactors: () => apiRequest("/xfactors"),

  getScoringMeta: () => apiRequest("/meta/scoring"),

  updatePrediction: (matchId, payload) =>
    apiRequest(`/predictions/${matchId}`,{
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

};
