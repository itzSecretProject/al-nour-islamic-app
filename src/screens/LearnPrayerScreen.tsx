import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronLeft as Prev, Droplets, Hand, Sparkles, BookOpen, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../hooks/useSettings';
import { useUI } from '../context/UIContext';

// ---------------------------------------------------------------------------
// Learn to Pray — Salah, Wudu (ablution) & Ghusl (full purification)
// Step-by-step illustrated guide. Illustrations are clean, static line-art
// silhouettes (no faces, no eyes, no animated character).
// ---------------------------------------------------------------------------

type Lang = 'en' | 'es' | 'ar' | 'fr' | 'de' | 'tr' | 'pt';
type Loc = Partial<Record<Lang, string>> & { en: string };

interface Step {
  fig: FigureKind;
  title: Loc;
  instruction: Loc;
  arabic?: string;
  translit?: string;
  meaning?: Loc;
}

type FigureKind =
  | 'takbir' | 'qiyam' | 'ruku' | 'itidal' | 'sujood' | 'julus' | 'tashahhud' | 'salawat' | 'tasleem'
  | 'hands' | 'mouth' | 'nose' | 'face' | 'arm' | 'head' | 'feet' | 'body' | 'water' | 'intention';

const UI: Record<Lang, Record<string, string>> = {
  en: { title: 'Learn to Pray', subtitle: 'Step-by-step guide', tabSalah: 'Salah', tabWudu: 'Wudu', tabGhusl: 'Ghusl', tabPrayers: 'Daily', step: 'Step', of: 'of', say: 'Recite', meaning: 'Meaning', prev: 'Back', next: 'Next', done: 'Finish', start: 'Start over', fard: 'Obligatory', sunnah: 'Sunnah', witr: 'Witr', aloud: 'Aloud', silent: 'Silent', rakatStr: 'Rak\'ahs', reciteAfterFatiha: 'After Al-Fatiha add any short surah', onlyFatiha: 'Recite Al-Fatiha only (no extra surah)', shortSurahs: 'Recommended short surahs' },
  es: { title: 'Aprende a Rezar', subtitle: 'Guía paso a paso', tabSalah: 'Salah', tabWudu: 'Wudu', tabGhusl: 'Ghusl', tabPrayers: 'Diario', step: 'Paso', of: 'de', say: 'Recita', meaning: 'Significado', prev: 'Atrás', next: 'Siguiente', done: 'Terminar', start: 'Empezar de nuevo', fard: 'Obligatorio', sunnah: 'Sunnah', witr: 'Witr', aloud: 'En voz alta', silent: 'En silencio', rakatStr: 'Raka\'as', reciteAfterFatiha: 'Tras Al-Fatiha añade cualquier sura corta', onlyFatiha: 'Solo Al-Fatiha (sin sura adicional)', shortSurahs: 'Suras cortas recomendadas' },
  ar: { title: 'تعلّم الصلاة', subtitle: 'دليل خطوة بخطوة', tabSalah: 'الصلاة', tabWudu: 'الوضوء', tabGhusl: 'الغسل', tabPrayers: 'اليومية', step: 'خطوة', of: 'من', say: 'اقرأ', meaning: 'المعنى', prev: 'السابق', next: 'التالي', done: 'إنهاء', start: 'البدء من جديد', fard: 'فرض', sunnah: 'سنة', witr: 'وتر', aloud: 'جهراً', silent: 'سراً', rakatStr: 'ركعات', reciteAfterFatiha: 'بعد الفاتحة أضف أي سورة قصيرة', onlyFatiha: 'الفاتحة فقط بدون سورة إضافية', shortSurahs: 'سور قصيرة مقترحة' },
  fr: { title: 'Apprendre à Prier', subtitle: 'Guide étape par étape', tabSalah: 'Salat', tabWudu: 'Woudou', tabGhusl: 'Ghusl', tabPrayers: 'Quotidien', step: 'Étape', of: 'sur', say: 'Récitez', meaning: 'Signification', prev: 'Retour', next: 'Suivant', done: 'Terminer', start: 'Recommencer', fard: 'Obligatoire', sunnah: 'Sunna', witr: 'Witr', aloud: 'À voix haute', silent: 'En silence', rakatStr: 'Rak\'ahs', reciteAfterFatiha: 'Après Al-Fatiha, ajoutez une courte sourate', onlyFatiha: 'Al-Fatiha uniquement', shortSurahs: 'Sourates courtes recommandées' },
  de: { title: 'Beten Lernen', subtitle: 'Schritt-für-Schritt', tabSalah: 'Salah', tabWudu: 'Wudu', tabGhusl: 'Ghusl', tabPrayers: 'Täglich', step: 'Schritt', of: 'von', say: 'Rezitiere', meaning: 'Bedeutung', prev: 'Zurück', next: 'Weiter', done: 'Fertig', start: 'Neu starten', fard: 'Pflicht', sunnah: 'Sunna', witr: 'Witr', aloud: 'Laut', silent: 'Still', rakatStr: 'Rak\'ahs', reciteAfterFatiha: 'Nach Al-Fatiha eine kurze Sure', onlyFatiha: 'Nur Al-Fatiha', shortSurahs: 'Empfohlene kurze Suren' },
  tr: { title: 'Namaz Öğren', subtitle: 'Adım adım rehber', tabSalah: 'Namaz', tabWudu: 'Abdest', tabGhusl: 'Gusül', tabPrayers: 'Günlük', step: 'Adım', of: '/', say: 'Oku', meaning: 'Anlamı', prev: 'Geri', next: 'İleri', done: 'Bitir', start: 'Yeniden başla', fard: 'Farz', sunnah: 'Sünnet', witr: 'Vitir', aloud: 'Sesli', silent: 'Sessiz', rakatStr: 'Rekat', reciteAfterFatiha: 'Fatiha\'dan sonra kısa bir sure ekle', onlyFatiha: 'Sadece Fatiha', shortSurahs: 'Önerilen kısa sureler' },
  pt: { title: 'Aprenda a Rezar', subtitle: 'Guia passo a passo', tabSalah: 'Salah', tabWudu: 'Wudu', tabGhusl: 'Ghusl', tabPrayers: 'Diário', step: 'Passo', of: 'de', say: 'Recite', meaning: 'Significado', prev: 'Voltar', next: 'Próximo', done: 'Concluir', start: 'Recomeçar', fard: 'Obrigatório', sunnah: 'Sunna', witr: 'Witr', aloud: 'Em voz alta', silent: 'Em silêncio', rakatStr: 'Rak\'ahs', reciteAfterFatiha: 'Após Al-Fatiha adicione uma sura curta', onlyFatiha: 'Apenas Al-Fatiha', shortSurahs: 'Suras curtas recomendadas' },
};

// ---- Content (full en/es/ar; other languages fall back to en) ----

const SALAH: Step[] = [
  {
    fig: 'intention',
    title: { en: 'Intention (Niyyah)', es: 'Intención (Niyyah)', ar: 'النية' },
    instruction: {
      en: 'Face the Qibla and make the intention in your heart for the prayer you are about to perform. The intention is not spoken aloud.',
      es: 'Orientate hacia la Qibla y haz la intención en tu corazón de la oración que vas a realizar. La intención no se dice en voz alta.',
      ar: 'استقبل القبلة وانوِ بقلبك الصلاة التي تريد أداءها. النية محلها القلب ولا تُلفظ.',
    },
  },
  {
    fig: 'takbir',
    title: { en: 'Opening Takbir', es: 'Takbir de apertura', ar: 'تكبيرة الإحرام' },
    instruction: {
      en: 'Raise both hands to your ears (or shoulders) and say the Takbir. This begins the prayer.',
      es: 'Levanta ambas manos hasta las orejas (u hombros) y di el Takbir. Con esto comienza la oración.',
      ar: 'ارفع يديك إلى أذنيك (أو كتفيك) وقل التكبير. بهذا تبدأ الصلاة.',
    },
    arabic: 'اللَّهُ أَكْبَر', translit: 'Allāhu Akbar',
    meaning: { en: 'Allah is the Greatest.', es: 'Allah es el Más Grande.', ar: 'الله أكبر.' },
  },
  {
    fig: 'qiyam',
    title: { en: 'Standing (Qiyam)', es: 'De pie (Qiyam)', ar: 'القيام' },
    instruction: {
      en: 'Place your right hand over your left on your chest. Recite Surah Al-Fatihah, then a short surah (e.g. Al-Ikhlas).',
      es: 'Coloca tu mano derecha sobre la izquierda en el pecho. Recita la Sura Al-Fatihah y luego una sura corta (p. ej. Al-Ikhlas).',
      ar: 'ضع يدك اليمنى على اليسرى على صدرك. اقرأ سورة الفاتحة ثم سورة قصيرة (مثل الإخلاص).',
    },
  },
  {
    fig: 'ruku',
    title: { en: 'Bowing (Ruku)', es: 'Inclinación (Ruku)', ar: 'الركوع' },
    instruction: {
      en: 'Say "Allahu Akbar", bow with a straight back and hands on the knees. Say the tasbih three times.',
      es: 'Di "Allahu Akbar", inclínate con la espalda recta y las manos sobre las rodillas. Di el tasbih tres veces.',
      ar: 'قل "الله أكبر" واركع وظهرك مستوٍ ويداك على ركبتيك. قل التسبيح ثلاثًا.',
    },
    arabic: 'سُبْحَانَ رَبِّيَ الْعَظِيم', translit: 'Subhāna Rabbiyal-‘Adhīm',
    meaning: { en: 'Glory to my Lord, the Most Great.', es: 'Gloria a mi Señor, el Inmenso.', ar: 'تنزيهًا لربي العظيم.' },
  },
  {
    fig: 'itidal',
    title: { en: 'Rising (I‘tidal)', es: 'Levantarse (I‘tidal)', ar: 'الاعتدال' },
    instruction: {
      en: 'Rise back to standing while saying the following, then add "Rabbana wa lakal-hamd".',
      es: 'Vuelve a ponerte de pie diciendo lo siguiente, y añade "Rabbana wa lakal-hamd".',
      ar: 'ارفع رأسك قائمًا قائلًا ما يلي، ثم قل "ربنا ولك الحمد".',
    },
    arabic: 'سَمِعَ اللَّهُ لِمَنْ حَمِدَه', translit: 'Sami‘a Allāhu liman ḥamidah',
    meaning: { en: 'Allah hears the one who praises Him.', es: 'Allah escucha a quien Lo alaba.', ar: 'سمع الله لمن حمده.' },
  },
  {
    fig: 'sujood',
    title: { en: 'Prostration (Sujood)', es: 'Postración (Sujood)', ar: 'السجود' },
    instruction: {
      en: 'Say "Allahu Akbar" and prostrate so that forehead, nose, both palms, knees and toes touch the ground. Say the tasbih three times.',
      es: 'Di "Allahu Akbar" y póstrate de modo que la frente, la nariz, las palmas, las rodillas y los dedos de los pies toquen el suelo. Di el tasbih tres veces.',
      ar: 'قل "الله أكبر" واسجد بحيث تلمس الأرض جبهتك وأنفك وكفاك وركبتاك وأطراف قدميك. قل التسبيح ثلاثًا.',
    },
    arabic: 'سُبْحَانَ رَبِّيَ الْأَعْلَى', translit: 'Subhāna Rabbiyal-A‘lā',
    meaning: { en: 'Glory to my Lord, the Most High.', es: 'Gloria a mi Señor, el Altísimo.', ar: 'تنزيهًا لربي الأعلى.' },
  },
  {
    fig: 'julus',
    title: { en: 'Sitting (Julus)', es: 'Sentado (Julus)', ar: 'الجلوس' },
    instruction: {
      en: 'Say "Allahu Akbar", sit briefly between the two prostrations, then prostrate a second time.',
      es: 'Di "Allahu Akbar", siéntate brevemente entre las dos postraciones, luego póstrate una segunda vez.',
      ar: 'قل "الله أكبر" واجلس قليلًا بين السجدتين، ثم اسجد ثانيةً.',
    },
    arabic: 'رَبِّ اغْفِرْ لِي', translit: 'Rabbi-ghfir lī',
    meaning: { en: 'My Lord, forgive me.', es: 'Señor mío, perdóname.', ar: 'رب اغفر لي.' },
  },
  {
    fig: 'tashahhud',
    title: { en: 'Tashahhud', es: 'Tashahhud', ar: 'التشهد' },
    instruction: {
      en: 'After completing the rakahs, sit with your right index finger raised. Recite the complete Tashahhud slowly.',
      es: 'Tras completar las rakahs, siéntate levantando el dedo índice derecho. Recita el Tashahhud completo despacio.',
      ar: 'بعد إتمام الركعات، اجلس رافعًا سبابتك اليمنى. اقرأ التشهد كاملًا بتأنٍّ.',
    },
    arabic: 'التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',
    translit: "At-taḥiyyātu lillāhi waṣ-ṣalawātu waṭ-ṭayyibāt, as-salāmu 'alayka ayyuhan-nabiyyu wa raḥmatullāhi wa barakātuh, as-salāmu 'alaynā wa 'alā 'ibādillāhiṣ-ṣāliḥīn, ashhadu allā ilāha illallāhu wa ashhadu anna Muḥammadan 'abduhu wa rasūluh",
    meaning: {
      en: 'All greetings, prayers and good words belong to Allah. Peace be upon you, O Prophet, and the mercy and blessings of Allah. Peace be upon us and upon the righteous servants of Allah. I testify there is no god but Allah and I testify that Muhammad is His servant and messenger.',
      es: 'Todos los saludos, oraciones y buenas palabras son de Allah. La paz sea contigo, O Profeta, y la misericordia y bendiciones de Allah. La paz sea sobre nosotros y sobre los siervos rectos de Allah. Atestiguo que no hay dios sino Allah y que Muhammad es Su siervo y mensajero.',
      ar: 'التحيات والصلوات والطيبات لله. السلام عليك أيها النبي ورحمة الله وبركاته. السلام علينا وعلى عباد الله الصالحين. أشهد أن لا إله إلا الله وأشهد أن محمدًا عبده ورسوله.',
    },
  },
  {
    fig: 'salawat',
    title: { en: 'Salawat Ibrahimiyya', es: 'Salawat Ibrahimiyya', ar: 'الصلاة الإبراهيمية' },
    instruction: {
      en: 'Still seated, send blessings upon the Prophet ﷺ and his family. This completes the prayer before Tasleem.',
      es: 'Aún sentado, envía bendiciones sobre el Profeta ﷺ y su familia. Esto completa la oración antes del Tasleem.',
      ar: 'وأنت جالس، صلِّ على النبي ﷺ وآله. وبهذا تكتمل الصلاة قبل التسليم.',
    },
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
    translit: "Allāhumma ṣalli 'alā Muḥammadin wa 'alā āli Muḥammadin kamā ṣallayta 'alā Ibrāhīma wa 'alā āli Ibrāhīm, innaka Ḥamīdun Majīd. Allāhumma bārik 'alā Muḥammadin wa 'alā āli Muḥammadin kamā bārakta 'alā Ibrāhīma wa 'alā āli Ibrāhīm, innaka Ḥamīdun Majīd",
    meaning: {
      en: 'O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim — You are indeed Praiseworthy, Most Glorious. O Allah, send blessings upon Muhammad and the family of Muhammad, as You sent blessings upon Ibrahim and the family of Ibrahim — You are indeed Praiseworthy, Most Glorious.',
      es: 'O Allah, envía bendiciones sobre Muhammad y la familia de Muhammad, tal como enviaste bendiciones sobre Ibrahim y la familia de Ibrahim — Tú eres verdaderamente Digno de alabanza, el Más Glorioso. O Allah, bendice a Muhammad y a la familia de Muhammad, tal como bendijiste a Ibrahim y a la familia de Ibrahim — Tú eres verdaderamente Digno de alabanza, el Más Glorioso.',
      ar: 'اللهم صلِّ على محمد وعلى آل محمد كما صليت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد. اللهم بارك على محمد وعلى آل محمد كما باركت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد.',
    },
  },
  {
    fig: 'tasleem',
    title: { en: 'Tasleem (Closing)', es: 'Tasleem (Cierre)', ar: 'التسليم' },
    instruction: {
      en: 'Turn your head to the right, then to the left, giving the greeting of peace each time. The prayer is complete.',
      es: 'Gira la cabeza a la derecha y luego a la izquierda, dando el saludo de paz cada vez. La oración ha terminado.',
      ar: 'التفت بوجهك يمينًا ثم يسارًا مسلِّمًا في كل مرة. بذلك تمت الصلاة.',
    },
    arabic: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّه', translit: 'As-salāmu ‘alaykum wa raḥmatullāh',
    meaning: { en: 'Peace and mercy of Allah be upon you.', es: 'La paz y la misericordia de Allah sean con vosotros.', ar: 'السلام عليكم ورحمة الله.' },
  },
];

const WUDU: Step[] = [
  {
    fig: 'intention',
    title: { en: 'Intention & Bismillah', es: 'Intención y Bismillah', ar: 'النية والتسمية' },
    instruction: {
      en: 'Make the intention to purify yourself and say "Bismillah" (In the name of Allah).',
      es: 'Haz la intención de purificarte y di "Bismillah" (En el nombre de Allah).',
      ar: 'انوِ الطهارة وقل "بسم الله".',
    },
  },
  {
    fig: 'hands',
    title: { en: 'Wash the hands', es: 'Lavar las manos', ar: 'غسل اليدين' },
    instruction: {
      en: 'Wash both hands up to the wrists three times, including between the fingers.',
      es: 'Lava ambas manos hasta las muñecas tres veces, incluyendo entre los dedos.',
      ar: 'اغسل يديك إلى الرسغين ثلاث مرات، وخلِّل بين الأصابع.',
    },
  },
  {
    fig: 'mouth',
    title: { en: 'Rinse the mouth', es: 'Enjuagar la boca', ar: 'المضمضة' },
    instruction: {
      en: 'Take water into your mouth and rinse it thoroughly three times.',
      es: 'Toma agua en la boca y enjuágala bien tres veces.',
      ar: 'أدخل الماء إلى فمك ومضمض جيدًا ثلاث مرات.',
    },
  },
  {
    fig: 'nose',
    title: { en: 'Rinse the nose', es: 'Limpiar la nariz', ar: 'الاستنشاق' },
    instruction: {
      en: 'Sniff water gently into the nose and blow it out, three times.',
      es: 'Aspira agua suavemente por la nariz y expúlsala, tres veces.',
      ar: 'استنشق الماء برفق ثم استنثره، ثلاث مرات.',
    },
  },
  {
    fig: 'face',
    title: { en: 'Wash the face', es: 'Lavar el rostro', ar: 'غسل الوجه' },
    instruction: {
      en: 'Wash the whole face from forehead to chin and ear to ear, three times.',
      es: 'Lava todo el rostro, de la frente al mentón y de oreja a oreja, tres veces.',
      ar: 'اغسل وجهك كاملًا من منبت الشعر إلى الذقن ومن الأذن إلى الأذن، ثلاثًا.',
    },
  },
  {
    fig: 'arm',
    title: { en: 'Wash the arms', es: 'Lavar los brazos', ar: 'غسل اليدين إلى المرفقين' },
    instruction: {
      en: 'Wash the right arm from fingertips to the elbow three times, then the left.',
      es: 'Lava el brazo derecho desde los dedos hasta el codo tres veces, luego el izquierdo.',
      ar: 'اغسل ذراعك اليمنى من أطراف الأصابع إلى المرفق ثلاثًا، ثم اليسرى.',
    },
  },
  {
    fig: 'head',
    title: { en: 'Wipe the head & ears', es: 'Pasar las manos por la cabeza y orejas', ar: 'مسح الرأس والأذنين' },
    instruction: {
      en: 'With wet hands, wipe over the head once from front to back, then wipe the ears.',
      es: 'Con las manos húmedas, pasa una vez por la cabeza de adelante hacia atrás, luego limpia las orejas.',
      ar: 'بيدين مبللتين امسح رأسك مرة من الأمام إلى الخلف، ثم امسح أذنيك.',
    },
  },
  {
    fig: 'feet',
    title: { en: 'Wash the feet', es: 'Lavar los pies', ar: 'غسل القدمين' },
    instruction: {
      en: 'Wash the right foot up to the ankle three times, including between the toes, then the left.',
      es: 'Lava el pie derecho hasta el tobillo tres veces, incluyendo entre los dedos, luego el izquierdo.',
      ar: 'اغسل قدمك اليمنى إلى الكعب ثلاثًا وخلِّل بين الأصابع، ثم اليسرى.',
    },
  },
  {
    fig: 'water',
    title: { en: 'Closing supplication', es: 'Súplica final', ar: 'دعاء الختام' },
    instruction: {
      en: 'After completing the wudu, recite the Shahada and supplication.',
      es: 'Tras completar el wudu, recita la Shahada y la súplica.',
      ar: 'بعد إتمام الوضوء، اقرأ الشهادة والدعاء.',
    },
    arabic: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُه',
    translit: 'Ashhadu an lā ilāha illā-llāh, wa ashhadu anna Muḥammadan ‘abduhu wa rasūluh',
    meaning: {
      en: 'I bear witness that there is no god but Allah, and that Muhammad is His servant and messenger.',
      es: 'Atestiguo que no hay más dios que Allah, y que Muhammad es Su siervo y mensajero.',
      ar: 'أشهد أن لا إله إلا الله وأشهد أن محمدًا عبده ورسوله.',
    },
  },
];

const GHUSL: Step[] = [
  {
    fig: 'intention',
    title: { en: 'Intention & wash hands', es: 'Intención y lavar manos', ar: 'النية وغسل اليدين' },
    instruction: {
      en: 'Make the intention for ghusl, say "Bismillah", and wash both hands three times.',
      es: 'Haz la intención del ghusl, di "Bismillah" y lava ambas manos tres veces.',
      ar: 'انوِ الغسل وقل "بسم الله" واغسل يديك ثلاثًا.',
    },
  },
  {
    fig: 'water',
    title: { en: 'Wash private parts', es: 'Lavar las partes íntimas', ar: 'غسل الفرج' },
    instruction: {
      en: 'Wash the private parts and remove any impurity from the body.',
      es: 'Lava las partes íntimas y elimina cualquier impureza del cuerpo.',
      ar: 'اغسل فرجك وأزل أي نجاسة عن جسدك.',
    },
  },
  {
    fig: 'face',
    title: { en: 'Perform wudu', es: 'Realizar el wudu', ar: 'الوضوء' },
    instruction: {
      en: 'Perform a complete wudu (ablution) as you would for prayer.',
      es: 'Realiza un wudu (ablución) completo como lo harías para la oración.',
      ar: 'توضأ وضوءك للصلاة كاملًا.',
    },
  },
  {
    fig: 'head',
    title: { en: 'Pour water over the head', es: 'Verter agua sobre la cabeza', ar: 'إفاضة الماء على الرأس' },
    instruction: {
      en: 'Pour water over the head three times, making sure it reaches the roots of the hair.',
      es: 'Vierte agua sobre la cabeza tres veces, asegurándote de que llegue a la raíz del cabello.',
      ar: 'أفض الماء على رأسك ثلاثًا حتى يصل إلى أصول الشعر.',
    },
  },
  {
    fig: 'body',
    title: { en: 'Wash the whole body', es: 'Lavar todo el cuerpo', ar: 'غسل سائر الجسد' },
    instruction: {
      en: 'Pour water over the right side of the body, then the left, rubbing the skin so no part stays dry.',
      es: 'Vierte agua sobre el lado derecho del cuerpo, luego el izquierdo, frotando la piel para que no quede ninguna parte seca.',
      ar: 'أفض الماء على شقك الأيمن ثم الأيسر، ودلّك جسدك حتى لا يبقى موضع جاف.',
    },
  },
];

// ---------------------------------------------------------------------------
// Clean static SVG figures (no faces / no eyes). Robed silhouettes for postures
// and simple line-art for wudu/ghusl body parts.
// ---------------------------------------------------------------------------
function Figure({ kind }: { kind: FigureKind }) {
  const S = '#FCD34D';           // gold stroke / accent
  const F = 'rgba(6,95,70,0.55)'; // dark-green filled body
  const FL = 'rgba(6,95,70,0.30)'; // lighter for limbs
  const common = { width: '100%', height: '100%', viewBox: '0 0 100 120', fill: 'none' } as const;
  const sw = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (kind) {

    /* ── Intention — person standing, palms raised in du'a ── */
    case 'intention':
      return (
        <svg {...common}>
          <circle cx="50" cy="11" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          {/* robe */}
          <path d="M36 22 L28 108 L72 108 L64 22 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* left arm — bent up, palm facing viewer */}
          <path d="M36 38 L18 24 L14 32 L34 48 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M14 32 L10 28 L18 24" stroke={S} strokeWidth="1.5" {...sw}/>
          {/* right arm */}
          <path d="M64 38 L82 24 L86 32 L66 48 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M86 32 L90 28 L82 24" stroke={S} strokeWidth="1.5" {...sw}/>
          {/* gold accent line at bottom of robe */}
          <path d="M28 108 L72 108" stroke={S} strokeWidth="1" opacity="0.5" strokeLinecap="round"/>
        </svg>
      );

    /* ── Takbir — arms raised, thumbs beside ears ── */
    case 'takbir':
      return (
        <svg {...common}>
          <circle cx="50" cy="11" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          <path d="M38 22 L30 108 L70 108 L62 22 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* Left arm up-right to ear */}
          <path d="M38 32 L20 14 L16 22 L36 42 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* Right arm up-left to ear */}
          <path d="M62 32 L80 14 L84 22 L64 42 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* thumbs beside head */}
          <circle cx="17" cy="14" r="3" fill={S}/>
          <circle cx="83" cy="14" r="3" fill={S}/>
          <path d="M30 108 L70 108" stroke={S} strokeWidth="1" opacity="0.5" strokeLinecap="round"/>
        </svg>
      );

    /* ── Qiyam — standing, right hand over left on chest ── */
    case 'qiyam':
      return (
        <svg {...common}>
          <circle cx="50" cy="11" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          <path d="M38 22 L30 108 L70 108 L62 22 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* right arm — horizontal band, slightly higher */}
          <path d="M34 46 L66 46 L66 54 L34 54 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* left arm — band below right */}
          <path d="M34 54 L66 54 L66 60 L34 60 Z" fill={FL} stroke={S} strokeWidth="1" {...sw} opacity="0.7"/>
          {/* overlap seam */}
          <path d="M50 46 L50 60" stroke={S} strokeWidth="1" opacity="0.4" strokeLinecap="round"/>
          <path d="M30 108 L70 108" stroke={S} strokeWidth="1" opacity="0.5" strokeLinecap="round"/>
        </svg>
      );

    /* ── Ruku — 90° bow, back flat, hands on knees ── */
    case 'ruku':
      return (
        <svg {...common}>
          {/* ground hint */}
          <path d="M10 108 L90 108" stroke={S} strokeWidth="1" opacity="0.25" strokeLinecap="round"/>
          {/* head forward */}
          <circle cx="12" cy="52" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          {/* horizontal back */}
          <path d="M22 46 L82 46 L82 58 L22 58 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* left thigh — vertical */}
          <path d="M68 58 L64 108 L76 108 L80 58 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* right thigh (slightly behind) */}
          <path d="M74 58 L70 108 L82 108 L86 58 Z" fill={FL} stroke={S} strokeWidth="1" {...sw}/>
          {/* left arm down to knee */}
          <path d="M44 58 L40 80 L52 80 L52 58 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* hand on knee */}
          <path d="M38 78 L54 78" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          {/* right arm */}
          <path d="M60 58 L56 78 L68 78 L68 58 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M54 76 L70 76" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      );

    /* ── I'tidal — upright after ruku, arms at sides ── */
    case 'itidal':
      return (
        <svg {...common}>
          <circle cx="50" cy="11" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          <path d="M38 22 L30 108 L70 108 L62 22 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* left arm down at side */}
          <path d="M38 32 L28 62 L36 64 L46 36 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* right arm down at side */}
          <path d="M62 32 L72 62 L64 64 L54 36 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M30 108 L70 108" stroke={S} strokeWidth="1" opacity="0.5" strokeLinecap="round"/>
        </svg>
      );

    /* ── Sujood — prostration, forehead on ground ── */
    case 'sujood':
      return (
        <svg {...common}>
          <path d="M4 100 L96 100" stroke={S} strokeWidth="1.5" opacity="0.3" strokeLinecap="round"/>
          {/* forehead on ground */}
          <circle cx="14" cy="92" r="9" fill={F} stroke={S} strokeWidth="1.5"/>
          {/* forehead-ground contact */}
          <path d="M8 100 L20 100" stroke={S} strokeWidth="3" strokeLinecap="round"/>
          {/* back rising from head to raised seat */}
          <path d="M22 90 Q46 68 72 56 L76 70 Q50 80 28 100 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* seat / hips raised */}
          <path d="M72 56 L80 56 L84 100 L68 100 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* toes curled on ground */}
          <path d="M68 100 L84 100" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          {/* left hand flat beside head */}
          <path d="M14 100 L4 90 L10 86 L20 98 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* right hand flat */}
          <path d="M28 98 L22 86 L28 84 L36 96 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
        </svg>
      );

    /* ── Julus — sitting briefly between prostrations ── */
    case 'julus':
      return (
        <svg {...common}>
          <path d="M8 100 L92 100" stroke={S} strokeWidth="1" opacity="0.25" strokeLinecap="round"/>
          <circle cx="50" cy="20" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          {/* torso */}
          <path d="M42 30 L36 72 L64 72 L58 30 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* thighs on ground */}
          <path d="M36 72 L18 100 L50 100 L64 72 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* feet */}
          <path d="M18 100 L6 100" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M50 100 L66 100" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          {/* left arm on left thigh */}
          <path d="M36 52 L22 74 L28 78 L42 56 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* right arm on right thigh */}
          <path d="M58 52 L70 72 L64 76 L52 56 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
        </svg>
      );

    /* ── Tashahhud — sitting, right index finger raised ── */
    case 'tashahhud':
      return (
        <svg {...common}>
          <path d="M8 100 L92 100" stroke={S} strokeWidth="1" opacity="0.25" strokeLinecap="round"/>
          <circle cx="50" cy="18" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          {/* torso */}
          <path d="M42 28 L36 70 L64 70 L58 28 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* sitting legs */}
          <path d="M36 70 L18 100 L50 100 L64 70 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M18 100 L6 100" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M50 100 L66 100" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          {/* left arm on left thigh */}
          <path d="M36 50 L22 72 L28 76 L42 54 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* right arm, elbow bent, finger up */}
          <path d="M58 48 L74 64 L70 68 L56 52 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* index finger pointing straight up */}
          <path d="M72 66 L78 44" stroke={S} strokeWidth="3.5" strokeLinecap="round"/>
          <circle cx="78" cy="42" r="3.5" fill={S}/>
        </svg>
      );

    /* ── Salawat — same sit, hands open/raised in gratitude ── */
    case 'salawat':
      return (
        <svg {...common}>
          <path d="M8 100 L92 100" stroke={S} strokeWidth="1" opacity="0.25" strokeLinecap="round"/>
          <circle cx="50" cy="18" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          <path d="M42 28 L36 70 L64 70 L58 28 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M36 70 L18 100 L50 100 L64 70 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M18 100 L6 100" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M50 100 L66 100" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          {/* both arms slightly raised, open palms */}
          <path d="M36 48 L18 38 L16 46 L34 56 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M64 48 L82 38 L84 46 L66 56 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* open palm lines */}
          <path d="M14 44 L20 48" stroke={S} strokeWidth="2" strokeLinecap="round"/>
          <path d="M82 44 L80 48" stroke={S} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );

    /* ── Tasleem — head turning right, salaam ── */
    case 'tasleem':
      return (
        <svg {...common}>
          <path d="M8 100 L92 100" stroke={S} strokeWidth="1" opacity="0.25" strokeLinecap="round"/>
          {/* head turned slightly right */}
          <circle cx="58" cy="18" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          {/* neck connecting to centered torso */}
          <path d="M54 28 L50 36" stroke={S} strokeWidth="2" strokeLinecap="round"/>
          <path d="M42 36 L36 70 L64 70 L58 36 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M36 70 L18 100 L50 100 L64 70 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M18 100 L6 100" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M50 100 L66 100" stroke={S} strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M42 52 L28 70 L34 74 L48 56 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M58 52 L70 68 L64 72 L52 56 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* arrow showing head turn direction (right) */}
          <path d="M72 16 L86 16" stroke={S} strokeWidth="2" strokeLinecap="round"/>
          <path d="M83 12 L87 16 L83 20" stroke={S} strokeWidth="2" {...sw}/>
        </svg>
      );

    /* ── Wudu figures ── */
    case 'hands':
      return (
        <svg {...common}>
          {/* water drops */}
          <path d="M32 14 C32 8 26 4 26 4 C26 4 20 8 20 14 C20 20 26 22 26 22 C26 22 32 20 32 14Z" fill={FL} stroke={S} strokeWidth="1.5"/>
          <path d="M54 10 C54 4 48 0 48 0 C48 0 42 4 42 10 C42 16 48 18 48 18 C48 18 54 16 54 10Z" fill={FL} stroke={S} strokeWidth="1.5"/>
          <path d="M80 14 C80 8 74 4 74 4 C74 4 68 8 68 14 C68 20 74 22 74 22 C74 22 80 20 80 14Z" fill={FL} stroke={S} strokeWidth="1.5"/>
          {/* two hands washing */}
          <path d="M16 60 L16 38 C16 34 22 34 22 38 L22 52 M22 52 L22 32 C22 28 28 28 28 32 L28 52 M28 52 L28 30 C28 26 34 26 34 30 L34 52 M34 52 L34 34 C34 30 40 30 40 34 L40 52" stroke={S} strokeWidth="2" {...sw}/>
          <path d="M16 52 C10 54 8 62 12 72 C16 84 24 92 38 92 C52 92 60 82 60 70 L60 48 C60 44 54 44 54 48 L54 60" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          {/* right hand */}
          <path d="M84 60 L84 38 C84 34 78 34 78 38 L78 52 M78 52 L78 32 C78 28 72 28 72 32 L72 52 M72 52 L72 30 C72 26 66 26 66 30 L66 52" stroke={S} strokeWidth="2" {...sw}/>
          <path d="M84 52 C90 54 92 62 88 72 C84 84 76 92 62 92 C48 92 40 82 40 70" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
        </svg>
      );

    case 'mouth':
      return (
        <svg {...common}>
          <path d="M50 16 C72 16 86 34 86 54 C86 74 72 90 50 90 C28 90 14 74 14 54 C14 34 28 16 50 16Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M32 64 Q50 80 68 64" fill="rgba(0,0,0,0.3)" stroke={S} strokeWidth="2" {...sw}/>
          {/* water droplet entering */}
          <path d="M80 20 C80 14 74 10 74 10 C74 10 68 14 68 20 C68 26 74 28 74 28 C74 28 80 26 80 20Z" fill={FL} stroke={S} strokeWidth="1.5"/>
        </svg>
      );

    case 'nose':
      return (
        <svg {...common}>
          <path d="M50 18 L50 64 Q40 68 40 78 Q40 90 50 90 Q60 90 60 78 Q60 68 50 64Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M40 82 Q36 78 36 74 Q40 70 44 74" stroke={S} strokeWidth="2" {...sw} fill="none"/>
          <path d="M60 82 Q64 78 64 74 Q60 70 56 74" stroke={S} strokeWidth="2" {...sw} fill="none"/>
          <path d="M76 16 C76 10 70 6 70 6 C70 6 64 10 64 16 C64 22 70 24 70 24 C70 24 76 22 76 16Z" fill={FL} stroke={S} strokeWidth="1.5"/>
        </svg>
      );

    case 'face':
      return (
        <svg {...common}>
          <path d="M50 12 C74 12 88 34 88 58 C88 82 74 100 50 100 C26 100 12 82 12 58 C12 34 26 12 50 12Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M30 84 Q50 98 70 84" stroke={S} strokeWidth="2" fill="none" {...sw}/>
          {/* water drops on forehead */}
          <path d="M36 10 C36 4 30 0 30 0 C30 0 24 4 24 10 C24 16 30 18 30 18 C30 18 36 16 36 10Z" fill={FL} stroke={S} strokeWidth="1.5"/>
          <path d="M68 14 C68 8 62 4 62 4 C62 4 56 8 56 14 C56 20 62 22 62 22 C62 22 68 20 68 14Z" fill={FL} stroke={S} strokeWidth="1.5"/>
        </svg>
      );

    case 'arm':
      return (
        <svg {...common}>
          {/* arm silhouette */}
          <path d="M18 22 L50 62 L82 100" strokeWidth="18" stroke="rgba(6,95,70,0.4)" strokeLinecap="round" {...sw}/>
          <path d="M18 22 L50 62 L82 100" stroke={S} strokeWidth="1.5" strokeLinecap="round" {...sw} fill="none"/>
          <circle cx="50" cy="62" r="8" fill={F} stroke={S} strokeWidth="1.5"/>
          {/* wrist */}
          <path d="M78 96 L86 104" stroke={S} strokeWidth="3" strokeLinecap="round"/>
          <path d="M82 92 L90 100" stroke={S} strokeWidth="3" strokeLinecap="round"/>
          {/* water drop */}
          <path d="M66 14 C66 8 60 4 60 4 C60 4 54 8 54 14 C54 20 60 22 60 22 C60 22 66 20 66 14Z" fill={FL} stroke={S} strokeWidth="1.5"/>
        </svg>
      );

    case 'head':
      return (
        <svg {...common}>
          {/* skull cap */}
          <path d="M50 22 C72 22 84 40 84 56 L16 56 C16 40 28 22 50 22Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M16 56 L84 56" stroke={S} strokeWidth="1.5" strokeLinecap="round"/>
          {/* ears */}
          <path d="M16 56 C10 58 8 68 14 72" stroke={S} strokeWidth="2" {...sw} fill="none"/>
          <path d="M84 56 C90 58 92 68 86 72" stroke={S} strokeWidth="2" {...sw} fill="none"/>
          {/* water flowing over head */}
          <path d="M32 20 Q50 10 68 20" stroke={S} strokeWidth="2" strokeDasharray="4 3" opacity="0.8" strokeLinecap="round"/>
          <path d="M38 16 Q50 6 62 16" stroke={S} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" strokeLinecap="round"/>
        </svg>
      );

    case 'feet':
      return (
        <svg {...common}>
          {/* left foot */}
          <path d="M22 36 L22 74 Q22 84 28 84 L44 84 Q50 84 50 80 Q50 76 44 76 L32 76 L32 36Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M32 84 L32 94 M38 84 L38 96 M44 84 L44 94" stroke={S} strokeWidth="2" strokeLinecap="round"/>
          {/* right foot */}
          <path d="M78 36 L78 74 Q78 84 72 84 L56 84 Q50 84 50 80 Q50 76 56 76 L68 76 L68 36Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M68 84 L68 94 M62 84 L62 96 M56 84 L56 94" stroke={S} strokeWidth="2" strokeLinecap="round"/>
          {/* water drops */}
          <path d="M36 22 C36 16 30 12 30 12 C30 12 24 16 24 22 C24 28 30 30 30 30 C30 30 36 28 36 22Z" fill={FL} stroke={S} strokeWidth="1.5"/>
          <path d="M76 22 C76 16 70 12 70 12 C70 12 64 16 64 22 C64 28 70 30 70 30 C70 30 76 28 76 22Z" fill={FL} stroke={S} strokeWidth="1.5"/>
        </svg>
      );

    case 'body':
      return (
        <svg {...common}>
          <circle cx="50" cy="14" r="10" fill={F} stroke={S} strokeWidth="1.5"/>
          <path d="M40 24 L32 80 L68 80 L60 24 Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M40 38 L24 52 L28 58 L44 44 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M60 38 L76 52 L72 58 L56 44 Z" fill={FL} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M32 80 L26 108 M68 80 L74 108" stroke={S} strokeWidth="6" strokeLinecap="round" opacity="0.6"/>
          {/* water cascade */}
          <path d="M82 16 Q90 44 82 72" stroke={S} strokeWidth="2" strokeDasharray="4 3" opacity="0.6" strokeLinecap="round"/>
        </svg>
      );

    case 'water':
    default:
      return (
        <svg {...common}>
          <path d="M50 16 C66 36 76 52 76 66 A26 26 0 0 1 24 66 C24 52 34 36 50 16Z" fill={F} stroke={S} strokeWidth="1.5" {...sw}/>
          <path d="M40 66 Q46 74 52 70" stroke={S} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
          <path d="M42 56 Q48 62 52 58" stroke={S} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        </svg>
      );
  }
}

function pick(loc: Loc | undefined, lang: Lang): string {
  if (!loc) return '';
  return loc[lang] ?? loc.en;
}

// ---------------------------------------------------------------------------
// Daily Prayers reference data
// ---------------------------------------------------------------------------

interface RakatBlock {
  type: 'fard' | 'sunnah' | 'witr';
  count: number;
  recitation: 'aloud' | 'silent' | 'mixed'; // mixed = first 2 aloud rest silent
}

interface DailyPrayer {
  id: string;
  arabic: string;
  translit: string;
  name: Loc;
  time: Loc;
  blocks: RakatBlock[];
  rakatStructure: Loc; // how rakats chain (e.g. tashahhud positions)
  surahs: { name: string; number: number }[];
}

const DAILY_PRAYERS: DailyPrayer[] = [
  {
    id: 'fajr',
    arabic: 'الفَجْر',
    translit: 'Fajr',
    name: { en: 'Dawn Prayer', es: 'Oración del Alba', ar: 'صلاة الفجر' },
    time: { en: 'Before sunrise', es: 'Antes del amanecer', ar: 'قبل شروق الشمس' },
    blocks: [
      { type: 'sunnah', count: 2, recitation: 'silent' },
      { type: 'fard', count: 2, recitation: 'aloud' },
    ],
    rakatStructure: {
      en: 'Rakat 1–2: Fatiha + surah (aloud) → Ruku → Sujood ×2. After Rakat 2: full Tashahhud + Salawat → Tasleem.',
      es: 'Raka\'a 1–2: Fatiha + sura (en voz alta) → Ruku → Sujud ×2. Tras la 2ª: Tashahhud completo + Salawat → Tasleem.',
      ar: 'الركعتان 1-2: الفاتحة + سورة (جهراً) → ركوع → سجدتان. بعد الركعة 2: التشهد الكامل + الصلاة على النبي → التسليم.',
    },
    surahs: [
      { name: 'Al-Kafirun', number: 109 },
      { name: 'Al-Ikhlas', number: 112 },
      { name: 'Al-Falaq', number: 113 },
    ],
  },
  {
    id: 'dhuhr',
    arabic: 'الظُّهْر',
    translit: 'Dhuhr',
    name: { en: 'Midday Prayer', es: 'Oración del Mediodía', ar: 'صلاة الظهر' },
    time: { en: 'After the sun passes its zenith', es: 'Cuando el sol supera el cenit', ar: 'بعد زوال الشمس' },
    blocks: [
      { type: 'sunnah', count: 4, recitation: 'silent' },
      { type: 'fard', count: 4, recitation: 'silent' },
      { type: 'sunnah', count: 2, recitation: 'silent' },
    ],
    rakatStructure: {
      en: 'Rakats 1–2: Fatiha + surah (silent). After Rakat 2: short Tashahhud → stand. Rakats 3–4: Fatiha only (silent). After Rakat 4: full Tashahhud + Salawat → Tasleem.',
      es: 'Raka\'as 1–2: Fatiha + sura (en silencio). Tras la 2ª: Tashahhud breve → ponerse de pie. Raka\'as 3–4: solo Fatiha (silencio). Tras la 4ª: Tashahhud completo + Salawat → Tasleem.',
      ar: 'الركعتان 1-2: الفاتحة + سورة (سراً). بعد الركعة 2: التشهد الأول → القيام. الركعتان 3-4: الفاتحة فقط (سراً). بعد الركعة 4: التشهد الأخير + الصلاة على النبي → التسليم.',
    },
    surahs: [
      { name: 'Al-Ikhlas', number: 112 },
      { name: 'Al-Asr', number: 103 },
      { name: 'Al-Kawthar', number: 108 },
    ],
  },
  {
    id: 'asr',
    arabic: 'العَصْر',
    translit: 'Asr',
    name: { en: 'Afternoon Prayer', es: 'Oración de la Tarde', ar: 'صلاة العصر' },
    time: { en: 'Mid-afternoon until just before sunset', es: 'Media tarde hasta poco antes del ocaso', ar: 'من العصر حتى قُبيل الغروب' },
    blocks: [
      { type: 'fard', count: 4, recitation: 'silent' },
    ],
    rakatStructure: {
      en: 'Same structure as Dhuhr (4 fard rakats). Rakats 1–2: Fatiha + surah (silent). Short Tashahhud after Rakat 2. Rakats 3–4: Fatiha only. Full Tashahhud + Salawat → Tasleem.',
      es: 'Misma estructura que Dhuhr (4 fard). Raka\'as 1–2: Fatiha + sura (silencio). Tashahhud breve tras la 2ª. Raka\'as 3–4: solo Fatiha. Tashahhud completo + Salawat → Tasleem.',
      ar: 'نفس بنية الظهر (4 فرض). الركعتان 1-2: الفاتحة + سورة (سراً). التشهد الأول بعد الركعة 2. الركعتان 3-4: الفاتحة فقط. التشهد الأخير + الصلاة على النبي → التسليم.',
    },
    surahs: [
      { name: 'Al-Ikhlas', number: 112 },
      { name: 'Al-Asr', number: 103 },
      { name: 'Al-Ma\'un', number: 107 },
    ],
  },
  {
    id: 'maghrib',
    arabic: 'المَغْرِب',
    translit: 'Maghrib',
    name: { en: 'Sunset Prayer', es: 'Oración del Atardecer', ar: 'صلاة المغرب' },
    time: { en: 'Just after sunset', es: 'Justo después del ocaso', ar: 'بعد غروب الشمس' },
    blocks: [
      { type: 'fard', count: 3, recitation: 'mixed' },
      { type: 'sunnah', count: 2, recitation: 'silent' },
    ],
    rakatStructure: {
      en: 'Rakats 1–2: Fatiha + surah (aloud). Short Tashahhud after Rakat 2 → stand. Rakat 3: Fatiha only (silent). Full Tashahhud + Salawat → Tasleem.',
      es: 'Raka\'as 1–2: Fatiha + sura (en voz alta). Tashahhud breve tras la 2ª → ponerse de pie. Raka\'a 3: solo Fatiha (silencio). Tashahhud completo + Salawat → Tasleem.',
      ar: 'الركعتان 1-2: الفاتحة + سورة (جهراً). التشهد الأول بعد الركعة 2 → القيام. الركعة 3: الفاتحة فقط (سراً). التشهد الأخير + الصلاة على النبي → التسليم.',
    },
    surahs: [
      { name: 'Al-Ikhlas', number: 112 },
      { name: 'Al-Falaq', number: 113 },
      { name: 'An-Nas', number: 114 },
    ],
  },
  {
    id: 'isha',
    arabic: 'العِشاء',
    translit: 'Isha',
    name: { en: 'Night Prayer', es: 'Oración de la Noche', ar: 'صلاة العشاء' },
    time: { en: 'After twilight disappears', es: 'Tras desaparecer el crepúsculo', ar: 'بعد اختفاء الشفق' },
    blocks: [
      { type: 'fard', count: 4, recitation: 'mixed' },
      { type: 'sunnah', count: 2, recitation: 'silent' },
      { type: 'witr', count: 3, recitation: 'aloud' },
    ],
    rakatStructure: {
      en: 'Rakats 1–2: Fatiha + surah (aloud). Short Tashahhud after Rakat 2. Rakats 3–4: Fatiha only (silent). Full Tashahhud + Salawat → Tasleem. Then Witr: 3 rakats — after Rakat 2 short Tashahhud, Rakat 3 add Du\'a al-Qunut before Ruku.',
      es: 'Raka\'as 1–2: Fatiha + sura (en voz alta). Tashahhud breve tras la 2ª. Raka\'as 3–4: solo Fatiha (silencio). Tashahhud completo + Salawat → Tasleem. Después Witr: 3 raka\'as — tras la 2ª Tashahhud breve, en la 3ª añadir Du\'a al-Qunut antes del Ruku.',
      ar: 'الركعتان 1-2: الفاتحة + سورة (جهراً). التشهد الأول بعد الركعة 2. الركعتان 3-4: الفاتحة فقط (سراً). التشهد الأخير + الصلاة على النبي → التسليم. ثم الوتر: 3 ركعات — تشهد بعد الركعة 2، والركعة 3 تُضاف دعاء القنوت قبل الركوع.',
    },
    surahs: [
      { name: 'Al-Ikhlas', number: 112 },
      { name: 'Al-Falaq', number: 113 },
      { name: 'An-Nas', number: 114 },
      { name: 'Al-Kawthar', number: 108 },
    ],
  },
];

interface Props { onClose: () => void; }

export function LearnPrayerScreen({ onClose }: Props) {
  const { settings } = useSettings();
  const { pushModal, popModal } = useUI();
  const lang = (settings.language as Lang) || 'en';
  const t = UI[lang] || UI.en;
  const isRTL = lang === 'ar';

  // Hide the bottom nav while this full-screen overlay is open
  useEffect(() => {
    pushModal();
    return () => popModal();
  }, []);

  const [tab, setTab] = useState<'salah' | 'wudu' | 'ghusl' | 'prayers'>('salah');
  const [i, setI] = useState(0);

  const isStepTab = tab !== 'prayers';
  const steps = tab === 'salah' ? SALAH : tab === 'wudu' ? WUDU : GHUSL;
  const step = isStepTab ? steps[i] : steps[0];
  const isLast = i === steps.length - 1;

  const switchTab = (next: 'salah' | 'wudu' | 'ghusl' | 'prayers') => { setTab(next); setI(0); };

  const tabs: { id: 'salah' | 'wudu' | 'ghusl' | 'prayers'; label: string; icon: React.ReactNode }[] = [
    { id: 'salah', label: t.tabSalah, icon: <BookOpen size={14} /> },
    { id: 'wudu', label: t.tabWudu, icon: <Hand size={14} /> },
    { id: 'ghusl', label: t.tabGhusl, icon: <Droplets size={14} /> },
    { id: 'prayers', label: t.tabPrayers, icon: <Sun size={14} /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 bg-[#022C22] text-[#F3F4F6] flex flex-col"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#022C22] to-[#011410] -z-10 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* ── Fixed top area ── */}
      <div className="flex-none px-5 pt-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <button onClick={onClose} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors shrink-0">
            <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#FCD34D] tracking-tight">{t.title}</h1>
            <p className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-semibold opacity-75 mt-0.5">{t.subtitle}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-black/20 p-1 rounded-2xl border border-white/5 mb-4 max-w-md w-full mx-auto">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => switchTab(tb.id)}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                tab === tb.id ? 'bg-[#059669] text-white shadow-md' : 'text-[#A7F3D0]/60 hover:text-white'
              }`}
            >
              {tb.icon}
              {tb.label}
            </button>
          ))}
        </div>

        {/* Progress dots — only for step-based tabs */}
        {isStepTab && (
          <div className="flex items-center justify-center gap-1.5 mb-3 max-w-md mx-auto">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`${t.step} ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-[#FCD34D]' : idx < i ? 'w-1.5 bg-emerald-400/60' : 'w-1.5 bg-white/15'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable content area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-2">
        <div className="max-w-md w-full mx-auto">

          {/* ── Daily prayers reference tab ── */}
          {tab === 'prayers' && (
            <AnimatePresence mode="wait">
              <motion.div
                key="prayers"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-4 pb-6"
              >
                {DAILY_PRAYERS.map((prayer) => (
                  <div key={prayer.id} className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-5 flex flex-col gap-3">
                    {/* Prayer header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#FCD34D] text-2xl font-bold" style={{ fontFamily: 'serif' }} dir="rtl">{prayer.arabic}</p>
                        <p className="text-white font-bold text-sm mt-0.5">{prayer.translit} · <span className="text-[#A7F3D0]/70 font-normal">{pick(prayer.name, lang)}</span></p>
                        <p className="text-[10px] text-white/40 mt-0.5">{pick(prayer.time, lang)}</p>
                      </div>
                      {/* Rakat blocks summary */}
                      <div className="flex flex-col gap-1 items-end">
                        {prayer.blocks.map((b, bi) => (
                          <div key={bi} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                            b.type === 'fard' ? 'bg-emerald-500/20 text-emerald-300' :
                            b.type === 'witr' ? 'bg-purple-500/20 text-purple-300' :
                            'bg-white/8 text-white/50'
                          }`}>
                            <span className="text-sm font-black">{b.count}</span>
                            <span>{t[b.type]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recitation info */}
                    <div className="flex flex-wrap gap-1.5">
                      {prayer.blocks.filter(b => b.type === 'fard').map((b, bi) => (
                        <span key={bi} className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 text-white/50">
                          {b.recitation === 'aloud' ? `${t.fard}: ${t.aloud}` :
                           b.recitation === 'mixed' ? `${t.fard}: ${t.aloud} (R1–2) · ${t.silent} (R3+)` :
                           `${t.fard}: ${t.silent}`}
                        </span>
                      ))}
                    </div>

                    {/* Rakat structure */}
                    <div className="bg-black/20 border border-white/8 rounded-2xl p-3.5">
                      <p className="text-[9px] uppercase tracking-widest text-[#FCD34D]/60 font-bold mb-2">
                        {pick({ en: 'Rakat structure', es: 'Estructura de raka\'as', ar: 'بنية الركعات' }, lang)}
                      </p>
                      <p className="text-xs text-[#A7F3D0]/80 leading-relaxed">{pick(prayer.rakatStructure, lang)}</p>
                    </div>

                    {/* After Fatiha note */}
                    <div className="bg-[#FCD34D]/[0.04] border border-[#FCD34D]/15 rounded-2xl p-3">
                      <p className="text-[9px] uppercase tracking-widest text-[#FCD34D]/60 font-bold mb-1.5">
                        {pick({ en: 'What to recite', es: 'Qué recitar', ar: 'ماذا تقرأ' }, lang)}
                      </p>
                      <p className="text-[10px] text-white/60 mb-2">{t.reciteAfterFatiha}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {prayer.surahs.map((s) => (
                          <span key={s.name} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FCD34D]/10 border border-[#FCD34D]/20 text-[#FCD34D]/80 font-medium">
                            {s.number}. {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {/* General recitation tip */}
                <div className="bg-black/25 border border-white/8 rounded-[2rem] p-5">
                  <p className="text-[9px] uppercase tracking-widest text-[#A7F3D0]/50 font-bold mb-2 flex items-center gap-1.5">
                    <Sparkles size={10} />
                    {pick({ en: 'Key rule for 3–4 rakat prayers', es: 'Regla clave para oraciones de 3–4 raka\'as', ar: 'قاعدة مهمة في صلوات 3-4 ركعات' }, lang)}
                  </p>
                  <p className="text-xs text-[#A7F3D0]/75 leading-relaxed">{t.onlyFatiha}</p>
                  <p className="text-[10px] text-white/40 mt-2 leading-relaxed">
                    {pick({ en: 'In Rakats 3 & 4 (Dhuhr/Asr/Isha) or Rakat 3 of Maghrib, recite Al-Fatiha only — no extra surah. The extra surah is only in Rakats 1 & 2.', es: 'En las raka\'as 3 y 4 (Dhuhr/Asr/Isha) o la raka\'a 3 del Maghrib, recita solo Al-Fatiha — sin sura adicional. La sura extra es solo en las raka\'as 1 y 2.', ar: 'في الركعتين 3 و4 (الظهر/العصر/العشاء) أو الركعة 3 من المغرب، اقرأ الفاتحة فقط دون سورة. السورة الإضافية في الركعتين 1 و2 فقط.' }, lang)}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── Step-based tabs (salah / wudu / ghusl) ── */}
          {isStepTab && (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${tab}-${i}`}
                initial={{ opacity: 0, x: isRTL ? -24 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 24 : -24 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-5 shadow-lg flex flex-col"
              >
                {/* Figure */}
                <div className="mx-auto w-32 h-32 mb-3 p-3 rounded-3xl bg-emerald-500/[0.06] border border-emerald-500/15 shrink-0">
                  <Figure kind={step.fig} />
                </div>

                <span className="text-[10px] font-mono text-[#A7F3D0]/50 uppercase tracking-widest text-center">
                  {t.step} {i + 1} {t.of} {steps.length}
                </span>
                <h2 className="text-base font-bold text-white text-center mt-1 mb-2">{pick(step.title, lang)}</h2>
                <p className="text-sm text-[#A7F3D0]/85 leading-relaxed text-center font-light">{pick(step.instruction, lang)}</p>

                {step.arabic && (
                  <div className="mt-4 bg-black/20 border border-white/10 rounded-2xl p-4 text-center">
                    <p className="text-[9px] uppercase tracking-widest text-[#FCD34D]/70 font-bold mb-2 flex items-center justify-center gap-1.5">
                      <Sparkles size={11} /> {t.say}
                    </p>
                    <p dir="rtl" className="text-lg text-white leading-loose font-semibold" style={{ fontFamily: 'serif' }}>{step.arabic}</p>
                    {step.translit && <p className="text-xs text-[#A7F3D0]/70 italic mt-2 leading-relaxed">{step.translit}</p>}
                    {step.meaning && (
                      <p className="text-xs text-white/60 mt-2 leading-relaxed">
                        <span className="text-[#FCD34D]/60">{t.meaning}: </span>{pick(step.meaning, lang)}
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Fixed bottom nav — only for step tabs ── */}
      {isStepTab && (
      <div className="flex-none px-5 pt-3 pb-8 bg-gradient-to-t from-[#011410] to-transparent">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="flex-1 py-3.5 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/[0.07] transition-colors"
          >
            <Prev size={16} className={isRTL ? 'rotate-180' : ''} /> {t.prev}
          </button>
          {isLast ? (
            <button
              onClick={() => setI(0)}
              className="flex-1 py-3.5 rounded-2xl bg-[#059669] text-sm font-bold text-white flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-colors shadow-md"
            >
              {t.start}
            </button>
          ) : (
            <button
              onClick={() => setI((v) => Math.min(steps.length - 1, v + 1))}
              className="flex-1 py-3.5 rounded-2xl bg-[#059669] text-sm font-bold text-white flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-colors shadow-md"
            >
              {t.next} <ChevronRight size={16} className={isRTL ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
      </div>
      )}
    </motion.div>
  );
}
