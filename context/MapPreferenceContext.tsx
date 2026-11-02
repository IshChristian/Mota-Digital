import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MapProvider = "google" | "osm";
const KEY = "map_provider";
const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
/** Google Maps is the primary map ("server 1") whenever an API key is configured. */
export const DEFAULT_MAP_PROVIDER: MapProvider = GOOGLE_KEY ? "google" : "osm";
export const googleMapsAvailable = Boolean(GOOGLE_KEY);

type Ctx = { mapProvider: MapProvider; setMapProvider: (p: MapProvider) => void };
const MapPreferenceContext = createContext<Ctx>({ mapProvider: DEFAULT_MAP_PROVIDER, setMapProvider: () => {} });

export function MapPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [mapProvider, setState] = useState<MapProvider>(DEFAULT_MAP_PROVIDER);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => { if (v === "osm" || (v === "google" && GOOGLE_KEY)) setState(v); }).catch(() => {});
  }, []);
  const setMapProvider = (p: MapProvider) => {
    if (p === "google" && !GOOGLE_KEY) return;
    setState(p);
    void AsyncStorage.setItem(KEY, p).catch(() => {});
  };
  return <MapPreferenceContext.Provider value={{ mapProvider, setMapProvider }}>{children}</MapPreferenceContext.Provider>;
}

export const useMapPreference = () => useContext(MapPreferenceContext);
