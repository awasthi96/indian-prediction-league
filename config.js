// src/config.js
import Constants from "expo-constants";

export const APP_ENV =
  Constants.expoConfig?.extra?.env || "local";

const API_MAP = {
  local: "http://192.168.1.6:8000",
  staging: "https://indian-prediction-league.vercel.app/",
  prod: "https://indian-prediction-league.vercel.app/",
};

export const API_BASE_URL =
  API_MAP[APP_ENV];
  

if (!API_BASE_URL) {
  throw new Error(`Invalid APP_ENV: ${APP_ENV}`);
}

console.log("APP_ENV =", APP_ENV);
console.log("API_BASE_URL =", API_BASE_URL);