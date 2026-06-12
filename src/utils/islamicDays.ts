export interface IslamicSpecialDay {
  name: string;
  nameAr: string;
  emoji: string;
  description: string;
  recommendation: string;
  duas: { title: string; arabic: string; transliteration: string; translation: string; translations?: Record<string, string> }[];
}

const SPECIAL_DAYS: Record<string, IslamicSpecialDay> = {
  '1-1': {
    name: 'Islamic New Year',
    nameAr: 'رأس السنة الهجرية',
    emoji: '🌙',
    description: "The first day of Muharram, the beginning of a new Hijri year.",
    recommendation: 'Reflect on the past year and set intentions for the new one.',
    duas: [
      {
        title: 'Dua for the New Year',
        arabic: 'اللَّهُمَّ أَدْخِلْهُ عَلَيْنَا بِالْأَمْنِ وَالْإِيمَانِ، وَالسَّلَامَةِ وَالْإِسْلَامِ، وَرِضْوَانٍ مِنَ الرَّحْمَنِ، وَجِوَارٍ مِنَ الشَّيْطَانِ',
        transliteration: "Allahumma adkhilhu alayna bil-amni wal-iman, was-salamati wal-islam, wa ridwanin minar-rahman, wa jiwarim minas-shaytan",
        translation: "O Allah, bring it upon us with security, faith, safety and Islam, with the pleasure of the Most Merciful, and protection from Satan.",
        translations: {
          es: "Oh Allah, tráenoslo con seguridad, fe, paz e Islam, con la complacencia del Misericordioso y protección del Shaytán."
        }
      },
    ],
  },
  '10-1': {
    name: 'Day of Ashura',
    nameAr: 'يوم عاشوراء',
    emoji: '🤲',
    description: "The 10th of Muharram. Fasting on this day expiates the sins of the previous year.",
    recommendation: 'Fast today and the 9th or 11th. It expiates sins of one year.',
    duas: [
      {
        title: 'Dua on Day of Ashura',
        arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
        transliteration: 'Hasbunallahu wa ni\'mal wakil',
        translation: "Allah is enough for us, and He is the best guardian.",
        translations: {
          es: "Allah nos basta, y Él es el mejor protector."
        }
      },
    ],
  },
  '12-3': {
    name: 'Mawlid al-Nabi',
    nameAr: 'المولد النبوي الشريف',
    emoji: '⭐',
    description: "The 12th of Rabi al-Awwal, the birth of the Prophet Muhammad ﷺ.",
    recommendation: 'Send abundant salawat upon the Prophet ﷺ today.',
    duas: [
      {
        title: 'Salawat upon the Prophet',
        arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
        transliteration: "Allahumma salli ala Muhammadin wa ala ali Muhammad",
        translation: "O Allah, send blessings upon Muhammad and upon the family of Muhammad.",
        translations: {
          es: "Oh Allah, bendice a Muhammad y a la familia de Muhammad."
        }
      },
    ],
  },
  '27-7': {
    name: "Isra' and Mi'raj",
    nameAr: 'ليلة الإسراء والمعراج',
    emoji: '🌠',
    description: "The night of the miraculous journey of the Prophet ﷺ to Jerusalem and the Heavens.",
    recommendation: 'Pray extra nawafil tonight and increase in dhikr and salawat.',
    duas: [
      {
        title: 'Prayer for Blessing this Night',
        arabic: 'سُبْحَانَ الَّذِي أَسْرَى بِعَبْدِهِ لَيْلاً مِّنَ الْمَسْجِدِ الْحَرَامِ إِلَى الْمَسْجِدِ الْأَقْصَى',
        transliteration: "Subhanal-ladhi asra bi-abdihi laylan minal-masjidil-harami ilal-masjidil-aqsa",
        translation: "Glory to Him who took His servant on a night journey from the Sacred Mosque to the Farthest Mosque.",
        translations: {
          es: "Gloria a Quien hizo viajar a Su siervo de noche desde la Mezquita Sagrada hasta la Mezquita Lejana."
        }
      },
    ],
  },
  '1-9': {
    name: 'Start of Ramadan',
    nameAr: 'بداية شهر رمضان المبارك',
    emoji: '🌙',
    description: "The blessed month of fasting, the Quran, and increased worship begins.",
    recommendation: 'Make intention for fasting and set goals for this blessed month.',
    duas: [
      {
        title: 'Dua for Sighting the Ramadan Moon',
        arabic: 'اللَّهُمَّ أَهِلَّهُ عَلَيْنَا بِالْأَمْنِ وَالْإِيمَانِ، وَالسَّلَامَةِ وَالْإِسْلَامِ، رَبِّي وَرَبُّكَ اللَّهُ',
        transliteration: "Allahumma ahillahu alayna bil-amni wal-iman, was-salamati wal-islam, rabbi wa rabbukallah",
        translation: "O Allah, bring this crescent upon us with security, faith, safety and Islam. My Lord and your Lord is Allah.",
        translations: {
          es: "Oh Allah, haz que esta luna creciente aparezca sobre nosotros con seguridad, fe, paz e Islam. Mi Señor y tu Señor es Allah."
        }
      },
    ],
  },
  '27-9': {
    name: "Laylat al-Qadr",
    nameAr: 'ليلة القدر',
    emoji: '✨',
    description: "The Night of Power, better than a thousand months. It falls in the last 10 nights of Ramadan.",
    recommendation: 'Stay up in prayer and repeat this dua throughout the night.',
    duas: [
      {
        title: "Dua of Laylat al-Qadr",
        arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
        transliteration: "Allahumma innaka afuwwun tuhibbul-afwa fa'fu anni",
        translation: "O Allah, You are forgiving and You love forgiveness, so forgive me.",
        translations: {
          es: "Oh Allah, Tú eres perdonador y amas el perdón, así que perdóname."
        }
      },
    ],
  },
  '1-10': {
    name: 'Eid al-Fitr',
    nameAr: 'عيد الفطر المبارك',
    emoji: '🎉',
    description: "The Feast of Breaking the Fast. Celebrate the completion of Ramadan with prayer and gratitude.",
    recommendation: 'Pray Eid prayer, give Zakat al-Fitr, and visit family and friends.',
    duas: [
      {
        title: 'Eid Takbir',
        arabic: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ لَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ وَلِلَّهِ الْحَمْدُ',
        transliteration: "Allahu akbar, Allahu akbar, la ilaha illallah, wallahu akbar, Allahu akbar, walillahil-hamd",
        translation: "Allah is the Greatest, Allah is the Greatest. There is no god but Allah. Allah is the Greatest, Allah is the Greatest, and to Allah belongs all praise.",
        translations: {
          es: "Allah es el Más Grande, Allah es el Más Grande. No hay más divinidad que Allah. Allah es el Más Grande, Allah es el Más Grande, y a Allah pertenecen todas las alabanzas."
        }
      },
    ],
  },
  '9-12': {
    name: 'Day of Arafah',
    nameAr: 'يوم عرفة',
    emoji: '🕋',
    description: "The 9th of Dhul Hijjah. The best day of the year. Fasting expiates two years of sins.",
    recommendation: 'Fast today if not on Hajj. Make abundant dua — it is the best day for supplication.',
    duas: [
      {
        title: "Best Dua of Arafah",
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku walahul-hamd, wa huwa ala kulli shayin qadir",
        translation: "There is no god but Allah, alone, without partner. To Him belongs all sovereignty and all praise, and He has power over all things.",
        translations: {
          es: "No hay más dios que Allah, único, sin socios. Suyo es el reino y suya es la alabanza, y Él tiene poder sobre todas las cosas."
        }
      },
    ],
  },
  '10-12': {
    name: 'Eid al-Adha',
    nameAr: 'عيد الأضحى المبارك',
    emoji: '🐑',
    description: "The Feast of Sacrifice. Commemorate the sacrifice of Ibrahim ﷺ with prayer and qurbani.",
    recommendation: 'Pray Eid prayer early, perform qurbani, and share meat with the poor.',
    duas: [
      {
        title: 'Eid Takbir',
        arabic: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ لَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ وَلِلَّهِ الْحَمْدُ',
        transliteration: "Allahu akbar, Allahu akbar, la ilaha illallah, wallahu akbar, Allahu akbar, walillahil-hamd",
        translation: "Allah is the Greatest, Allah is the Greatest. There is no god but Allah. Allah is the Greatest, Allah is the Greatest, and to Allah belongs all praise.",
        translations: {
          es: "Allah es el Más Grande, Allah es el Más Grande. No hay más divinidad que Allah. Allah es el Más Grande, Allah es el Más Grande, y a Allah pertenecen todas las alabanzas."
        }
      },
    ],
  },
};

export type WallpaperId = 'arafat' | 'mosque' | 'navy_gold' | 'charcoal' | 'emerald';

// Returns the wallpaper that best matches the current Islamic day/season, or
// null to keep the user's chosen wallpaper. Driven by the Hijri date.
export function getSeasonalWallpaper(hijriDay: number, hijriMonth: number): WallpaperId | null {
  // Dhul-Hijjah: first ten days + Arafah + Eid al-Adha → Mount Arafat scene.
  if (hijriMonth === 12 && hijriDay >= 1 && hijriDay <= 13) return 'arafat';
  // Ramadan: the whole blessed month → night mosque.
  if (hijriMonth === 9) return 'mosque';
  // Eid al-Fitr (first three days of Shawwal) → festive navy & gold.
  if (hijriMonth === 10 && hijriDay <= 3) return 'navy_gold';
  // Muharram 1 (New Year) & Ashura, Mawlid, Isra & Mi'raj → night mosque.
  if (hijriMonth === 1 && (hijriDay === 1 || hijriDay === 10)) return 'mosque';
  if (hijriMonth === 3 && hijriDay === 12) return 'mosque';
  if (hijriMonth === 7 && hijriDay === 27) return 'mosque';
  return null;
}

function getDaysUntil(today: { day: number; month: number }, target: { day: number; month: number }): number {
  // Approximate: each month ~30 days, year ~360 days
  const todayTotal = today.month * 30 + today.day;
  let targetTotal = target.month * 30 + target.day;
  let diff = targetTotal - todayTotal;
  if (diff < 0) diff += 360;
  return diff;
}

export function getIslamicDayInfo(hijriDay: number, hijriMonth: number): {
  today: IslamicSpecialDay | null;
  upcoming: (IslamicSpecialDay & { daysUntil: number }) | null;
} {
  const key = `${hijriDay}-${hijriMonth}`;
  const todayEvent = SPECIAL_DAYS[key] || null;

  // Check if any event is coming up in the next 3 days
  let upcoming: (IslamicSpecialDay & { daysUntil: number }) | null = null;
  for (const [eventKey, event] of Object.entries(SPECIAL_DAYS)) {
    const [d, m] = eventKey.split('-').map(Number);
    const daysUntil = getDaysUntil({ day: hijriDay, month: hijriMonth }, { day: d, month: m });
    if (daysUntil > 0 && daysUntil <= 3) {
      if (!upcoming || daysUntil < upcoming.daysUntil) {
        upcoming = { ...event, daysUntil };
      }
    }
  }

  return { today: todayEvent, upcoming };
}
