// Authentic morning & evening remembrances (Adhkar as-Sabah wal-Masa),
// drawn from Hisnul Muslim. `time` controls which session a dhikr appears in.

export interface Dhikr {
  id: string;
  time: 'morning' | 'evening' | 'both';
  count: number;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
}

export const adhkar: Dhikr[] = [
  {
    id: 'ayat-kursi',
    time: 'both',
    count: 1,
    arabic: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    transliteration: 'Allahu la ilaha illa huwal-hayyul-qayyum…',
    translation: 'Ayat al-Kursi — whoever recites it in the morning is protected until evening, and vice versa.',
    reference: 'Quran 2:255 — Al-Hakim',
  },
  {
    id: 'muawwidhat',
    time: 'both',
    count: 3,
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ • قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ • قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    transliteration: 'Qul huwallahu ahad • Qul a‘udhu bi-rabbil-falaq • Qul a‘udhu bi-rabbin-nas',
    translation: 'Recite Surah Al-Ikhlas, Al-Falaq and An-Nas — they suffice you against everything.',
    reference: 'Abu Dawud & Tirmidhi (3x each)',
  },
  {
    id: 'sayyid-istighfar',
    time: 'both',
    count: 1,
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي',
    transliteration: 'Allahumma anta rabbi la ilaha illa ant…',
    translation: 'The Chief of seeking forgiveness — whoever says it with certainty and dies that day/night enters Paradise.',
    reference: 'Sahih al-Bukhari',
  },
  {
    id: 'asbahna',
    time: 'morning',
    count: 1,
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Asbahna wa asbahal-mulku lillah…',
    translation: 'We have reached the morning and the dominion belongs to Allah… There is no god but Allah alone.',
    reference: 'Muslim',
  },
  {
    id: 'amsayna',
    time: 'evening',
    count: 1,
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ',
    transliteration: 'Amsayna wa amsal-mulku lillah…',
    translation: 'We have reached the evening and the dominion belongs to Allah… There is no god but Allah alone.',
    reference: 'Muslim',
  },
  {
    id: 'bika-asbahna',
    time: 'morning',
    count: 1,
    arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
    transliteration: 'Allahumma bika asbahna, wa bika amsayna…',
    translation: 'O Allah, by You we enter the morning and the evening, by You we live and die, and to You is the resurrection.',
    reference: 'Tirmidhi',
  },
  {
    id: 'bika-amsayna',
    time: 'evening',
    count: 1,
    arabic: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
    transliteration: 'Allahumma bika amsayna, wa bika asbahna…',
    translation: 'O Allah, by You we enter the evening and the morning, by You we live and die, and to You is the return.',
    reference: 'Tirmidhi',
  },
  {
    id: 'radeetu',
    time: 'both',
    count: 3,
    arabic: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا',
    transliteration: 'Radeetu billahi rabba, wa bil-islami deena, wa bi-Muhammadin nabiyya',
    translation: 'I am pleased with Allah as Lord, Islam as religion, and Muhammad ﷺ as Prophet — Allah will please him.',
    reference: 'Abu Dawud (3x)',
  },
  {
    id: 'la-yadurru',
    time: 'both',
    count: 3,
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    transliteration: 'Bismillahil-ladhi la yadurru ma‘asmihi shay’…',
    translation: 'In the name of Allah, with whose name nothing is harmed on earth or heaven — nothing will harm him.',
    reference: 'Abu Dawud & Tirmidhi (3x)',
  },
  {
    id: 'afiyah',
    time: 'both',
    count: 1,
    arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ',
    transliteration: 'Allahumma inni as’alukal-‘afwa wal-‘afiyah fid-dunya wal-akhirah',
    translation: 'O Allah, I ask You for pardon and well-being in this world and the next.',
    reference: 'Ibn Majah',
  },
  {
    id: 'subhanallah-100',
    time: 'both',
    count: 100,
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    transliteration: 'Subhanallahi wa bihamdihi',
    translation: 'Glory and praise be to Allah — whoever says it 100x, his sins are forgiven though they be as sea foam.',
    reference: 'Sahih al-Bukhari & Muslim (100x)',
  },
  {
    id: 'tahlil-10',
    time: 'both',
    count: 10,
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    transliteration: 'La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamd, wa huwa ‘ala kulli shay’in qadir',
    translation: 'There is no god but Allah alone… To Him belongs all dominion and praise, and He is over all things capable.',
    reference: 'Sahih al-Bukhari & Muslim (10x)',
  },
  {
    id: 'astaghfirullah-100',
    time: 'both',
    count: 100,
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullaha wa atubu ilayh',
    translation: 'I seek Allah’s forgiveness and turn to Him in repentance.',
    reference: 'Sahih al-Bukhari & Muslim',
  },
  {
    id: 'salat-nabi-10',
    time: 'both',
    count: 10,
    arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
    transliteration: 'Allahumma salli wa sallim ‘ala nabiyyina Muhammad',
    translation: 'O Allah, send blessings and peace upon our Prophet Muhammad ﷺ.',
    reference: 'At-Tabarani (morning & evening)',
  },
];
