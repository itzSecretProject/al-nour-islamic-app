import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { fetchMonthlyPrayerTimes } from '../api/aladhan';
import { PrayerData } from '../types';
import { useLocation } from '../hooks/useLocation';
import { useSettings } from '../hooks/useSettings';

interface PrayerContextType {
  prayerData: PrayerData | null;
  loading: boolean;
  error: string | null;
  resolvedCityName: string;
  refreshPrayerTimes: () => Promise<void>;
}

const PrayerContext = createContext<PrayerContextType>({
  prayerData: null,
  loading: true,
  error: null,
  resolvedCityName: '',
  refreshPrayerTimes: async () => {},
});

async function getCityName(lat: number, lng: number, lang: string = 'en'): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=${lang}`
    );
    if (!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    const address = data.address;
    if (address) {
      const state = address.state || address.region || '';
      const suburb = address.suburb || address.neighbourhood || address.village || address.town || address.city || '';
      if (state && suburb && state !== suburb) return `${state}, ${suburb}`;
      if (suburb) return suburb;
      if (state) return state;
    }
    return data.display_name ? data.display_name.split(',').slice(0, 2).join(',').trim() : `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  } catch {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
}

export const PrayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const browserLocation = useLocation();
  const { settings } = useSettings();
  
  const [prayerData, setPrayerData] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedCityName, setResolvedCityName] = useState('');

  const loadPrayerTimes = useCallback(async () => {
    setLoading(true);
    setError(null);

    let lat = 21.422487; // Mecca defaults
    let lng = 39.826206;
    let cityName = 'Mecca';

    if (settings.locationMode === 'auto') {
      if (browserLocation.loading) return; // Wait for browser location
      if (browserLocation.latitude && browserLocation.longitude) {
        lat = browserLocation.latitude;
        lng = browserLocation.longitude;
        // Fetch or use cached city name
        const cacheKey = `resolved_city_${lat.toFixed(4)}_${lng.toFixed(4)}_${settings.language || 'en'}`;
        const cachedCity = localStorage.getItem(cacheKey);
        if (cachedCity) {
          cityName = cachedCity;
        } else {
          cityName = await getCityName(lat, lng, settings.language || 'en');
          localStorage.setItem(cacheKey, cityName);
        }
      } else {
        cityName = 'Mecca (Default)';
      }
    } else {
      // Manual location mode
      lat = settings.manualLatitude;
      lng = settings.manualLongitude;
      cityName = settings.manualCityName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    }

    setResolvedCityName(cityName);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();

    // Cache key for the month
    const cacheKey = `monthly_prayers_${lat.toFixed(3)}_${lng.toFixed(3)}_${year}_${month}_m${settings.calculationMethod}`;
    const cachedDataStr = localStorage.getItem(cacheKey);

    if (cachedDataStr) {
      try {
        const monthlyData = JSON.parse(cachedDataStr);
        const dayData = monthlyData.find((d: any) => parseInt(d.date.gregorian.day) === day) || monthlyData[day - 1];
        if (dayData) {
          setPrayerData({
            timings: dayData.timings,
            date: dayData.date,
            meta: dayData.meta
          });
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached monthly timings', e);
      }
    }

    // Try fetching from API
    try {
      const monthlyData = await fetchMonthlyPrayerTimes(lat, lng, year, month, settings.calculationMethod);
      if (monthlyData && monthlyData.length > 0) {
        // Cache the entire month
        localStorage.setItem(cacheKey, JSON.stringify(monthlyData));
        const dayData = monthlyData.find((d: any) => parseInt(d.date.gregorian.day) === day) || monthlyData[day - 1];
        setPrayerData({
          timings: dayData.timings,
          date: dayData.date,
          meta: dayData.meta
        });
      } else {
        throw new Error('No timings returned from API');
      }
    } catch (err: any) {
      console.error('Failed to fetch timings, looking for fallback cache', err);
      // Fallback: use cached timings for the CURRENT month/year only, so we never
      // show another month's prayer schedule when offline.
      let foundFallback = false;
      const monthSuffix = `_${year}_${month}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('monthly_prayers_') && key.includes(monthSuffix)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '');
            const dayData = data.find((d: any) => parseInt(d.date.gregorian.day) === day) || data[day - 1];
            if (dayData) {
              setPrayerData({
                timings: dayData.timings,
                date: dayData.date,
                meta: dayData.meta
              });
              foundFallback = true;
              setError('Offline Fallback - Loaded from local cache');
              break;
            }
          } catch {}
        }
      }
      if (!foundFallback) {
        setError(err.message || 'Failed to fetch prayer times');
      }
    } finally {
      setLoading(false);
    }
  }, [
    browserLocation.latitude,
    browserLocation.longitude,
    browserLocation.loading,
    settings.locationMode,
    settings.manualLatitude,
    settings.manualLongitude,
    settings.manualCityName,
    settings.calculationMethod,
  ]);

  useEffect(() => {
    loadPrayerTimes();
  }, [loadPrayerTimes]);

  return (
    <PrayerContext.Provider
      value={{
        prayerData,
        loading,
        error,
        resolvedCityName,
        refreshPrayerTimes: loadPrayerTimes,
      }}
    >
      {children}
    </PrayerContext.Provider>
  );
};

export const usePrayerData = () => useContext(PrayerContext);
