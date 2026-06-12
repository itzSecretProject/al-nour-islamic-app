export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  audio?: string;
  audioSecondary?: string[];
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | object;
}

export interface SurahData {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  revelationType: string;
  numberOfAyahs: number;
  ayahs: Ayah[];
  edition: {
    identifier: string;
    language: string;
    name: string;
    englishName: string;
    format: string;
    type: string;
  };
}

export const fetchAllSurahs = async (): Promise<SurahMeta[]> => {
  try {
    const res = await fetch('https://api.alquran.cloud/v1/surah');
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error('Error fetching surahs:', error);
    throw error;
  }
};

// Returns [arabic, translation, audio, transliteration]
export const fetchSurahEditions = async (
  surahNumber: number,
  translationEdition: string = 'en.sahih',
  audioEdition: string = 'ar.alafasy'
): Promise<SurahData[]> => {
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,${translationEdition},${audioEdition},en.transliteration`);
    if (!res.ok) throw new Error(`API response status ${res.status}`);
    const json = await res.json();
    if (!json.data || json.data.length < 4) throw new Error("Incomplete API data received");
    return json.data;
  } catch (error) {
    console.warn(`Specific language editions failed to fetch, falling back to English defaults:`, error);
    try {
      const fallbackRes = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih,ar.alafasy,en.transliteration`);
      const json = await fallbackRes.json();
      return json.data;
    } catch (fallbackError) {
      console.error("Critical Quran API error:", fallbackError);
      throw fallbackError;
    }
  }
};
