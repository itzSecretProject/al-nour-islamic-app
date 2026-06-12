import { PrayerData } from '../types';

// Fetch single-day prayer timings
export const fetchPrayerTimes = async (lat: number, lng: number, method: number = 3): Promise<PrayerData> => {
  const date = new Date();
  const timestamp = Math.floor(date.getTime() / 1000);
  
  try {
    const response = await fetch(`https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=${method}`);
    if (!response.ok) {
      throw new Error('Failed to fetch prayer times');
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    throw error;
  }
};

// Fetch monthly prayer calendar
export const fetchMonthlyPrayerTimes = async (
  lat: number,
  lng: number,
  year: number,
  month: number,
  method: number = 3
): Promise<any[]> => {
  try {
    const response = await fetch(
      `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=${method}`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch monthly prayer times');
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching monthly prayer times:', error);
    throw error;
  }
};
