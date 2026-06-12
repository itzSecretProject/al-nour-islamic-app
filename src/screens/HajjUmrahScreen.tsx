import React, { useState, useEffect } from 'react';
import { ChevronLeft, Play, Pause, BookOpen, Compass, Award, Heart, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../hooks/useSettings';

interface Dua {
  arabic: string;
  transliteration: string;
  translation: Record<string, string>;
}

interface RitualStep {
  id: string;
  number: number;
  title: Record<string, string>;
  description: Record<string, string>;
  instruction: Record<string, string>;
  duas: Dua[];
}

// Translations for Hajj & Umrah Screen UI
const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    title: 'Hajj & Umrah Guide',
    subtitle: 'Step-by-step interactive pilgrimage rituals',
    tabUmrah: 'Umrah Guide',
    tabHajj: 'Hajj Guide',
    playDua: 'Listen to Dua',
    stopDua: 'Stop Dua',
    step: 'Step',
    completed: 'Mark Completed',
    completedSuccess: 'Completed!',
    introTitle: 'Pilgrimage Guide',
    introDesc: 'This guide outlines the essential steps and Duas for performing Umrah and Hajj in order. Ensure you enter the state of spiritual purity (Ihram) before crossing the Meeqat boundaries.',
    duasHeader: 'Recommended Duas',
    ttsActive: 'Synthesizing Arabic recitation...',
  },
  es: {
    title: 'Guía de Hajj y Umrah',
    subtitle: 'Rituales interactivos paso a paso de la peregrinación',
    tabUmrah: 'Guía de Umrah',
    tabHajj: 'Guía de Hajj',
    playDua: 'Escuchar Dua',
    stopDua: 'Detener Dua',
    step: 'Paso',
    completed: 'Marcar Completado',
    completedSuccess: '¡Completado!',
    introTitle: 'Guía de Peregrinación',
    introDesc: 'Esta guía describe los pasos esenciales y las Duas para realizar la Umrah y el Hajj en orden. Asegúrate de entrar en estado de pureza espiritual (Ihram) antes de cruzar los límites del Meeqat.',
    duasHeader: 'Duas Recomendadas',
    ttsActive: 'Sintetizando recitación en árabe...',
  },
  ar: {
    title: 'دليل الحج والعمرة',
    subtitle: 'مناسك الحج والعمرة التفاعلية خطوة بخطوة',
    tabUmrah: 'دليل العمرة',
    tabHajj: 'دليل الحج',
    playDua: 'استمع للدعاء',
    stopDua: 'إيقاف الدعاء',
    step: 'الخطوة',
    completed: 'تم الإنجاز',
    completedSuccess: 'اكتملت الخطوة!',
    introTitle: 'دليل المناسك',
    introDesc: 'يوضح هذا الدليل الخطوات الأساسية والأدعية لأداء العمرة والحج بالترتيب. تأكد من الدخول في حالة الإحرام قبل عبور مواقيت الحج والعمرة.',
    duasHeader: 'الأدعية الموصى بها',
    ttsActive: 'جاري تلاوة الدعاء بصوت آلي...',
  },
  fr: {
    title: 'Guide Hajj & Omra',
    subtitle: 'Rituels interactifs étape par étape du pèlerinage',
    tabUmrah: 'Guide de l’Omra',
    tabHajj: 'Guide du Hajj',
    playDua: 'Écouter le Doua',
    stopDua: 'Arrêter',
    step: 'Étape',
    completed: 'Marquer Terminé',
    completedSuccess: 'Terminé !',
    introTitle: 'Guide du Pèlerinage',
    introDesc: 'Ce guide détaille les étapes essentielles et les invocations pour accomplir l’Omra et le Hajj. Assurez-vous d’entrer en état de pureté spirituelle (Ihram) avant de franchir les limites du Meeqat.',
    duasHeader: 'Invocations Recommandées',
    ttsActive: 'Synthèse de la récitation en arabe...',
  },
  de: {
    title: 'Hajj & Umrah Führer',
    subtitle: 'Schritt-für-Schritt-Pilgerführer für Mekka',
    tabUmrah: 'Umrah-Führer',
    tabHajj: 'Hajj-Führer',
    playDua: 'Dua anhören',
    stopDua: 'Stoppen',
    step: 'Schritt',
    completed: 'Als erledigt markieren',
    completedSuccess: 'Erledigt!',
    introTitle: 'Pilgerfahrt-Führer',
    introDesc: 'Dieser Leitfaden beschreibt die wesentlichen Schritte und Duas zur Durchführung von Umrah und Hajj in der richtigen Reihenfolge. Stellen Sie sicher, dass Sie sich im Zustand der spirituellen Reinheit (Ihram) befinden.',
    duasHeader: 'Empfohlene Bittgebete',
    ttsActive: 'Arabische Rezitation wird vorgelesen...',
  },
  tr: {
    title: 'Hac ve Umre Rehberi',
    subtitle: 'Adım adım etkileşimli hac ve umre ibadetleri',
    tabUmrah: 'Umre Rehberi',
    tabHajj: 'Hac Rehberi',
    playDua: 'Duayı Dinle',
    stopDua: 'Durdur',
    step: 'Adım',
    completed: 'Tamamlandı Olarak İşaretle',
    completedSuccess: 'Tamamlandı!',
    introTitle: 'Hac Rehberi',
    introDesc: 'Bu rehber, sırasıyla Umre ve Hac yapmak için gerekli temel adımları ve Duaları özetlemektedir. Mikat sınırlarını geçmeden önce ihram (manevi temizlik) durumuna girdiğinizden emin olun.',
    duasHeader: 'Tavsiye Edilen Dualar',
    ttsActive: 'Arapça dua seslendiriliyor...',
  },
  pt: {
    title: 'Guia de Hajj & Umrah',
    subtitle: 'Rituais interativos passo a passo da peregrinação',
    tabUmrah: 'Guia de Umrah',
    tabHajj: 'Guia de Hajj',
    playDua: 'Ouvir a Dua',
    stopDua: 'Parar Dua',
    step: 'Passo',
    completed: 'Marcar Concluído',
    completedSuccess: 'Concluído!',
    introTitle: 'Guia de Peregrinação',
    introDesc: 'Este guia descreve os passos essenciais e as Duas para realizar a Umrah e o Hajj em ordem. Certifique-se de entrar no estado de pureza espiritual (Ihram) antes de cruzar os limites do Meeqat.',
    duasHeader: 'Duas Recomendadas',
    ttsActive: 'Sintetizando a recitação em árabe...',
  }
};

const UMRAH_STEPS: RitualStep[] = [
  {
    id: 'u_ihram',
    number: 1,
    title: {
      en: 'Ihram & Niyyah (Intention)',
      es: 'Ihram y Niyyah (Intención)',
      ar: 'الإحرام والنية',
      fr: 'Ihram & Niyyah (Intention)',
      de: 'Ihram & Niyyah (Absicht)',
      tr: 'İhram ve Niyet',
      pt: 'Ihram e Niyyah (Intenção)'
    },
    description: {
      en: 'Perform ghusl, wear the Ihram garments, and make the intention at the boundary (Meeqat).',
      es: 'Realiza el gusl, viste las prendas de Ihram y haz la intención en el límite territorial (Meeqat).',
      ar: 'الاغتسال، ولبس ملابس الإحرام، وعقد النية عند الميقات لبدء مناسك العمرة.',
      fr: 'Faire le ghusl, porter les vêtements de l’Ihram, et formuler l’intention avant de franchir le Meeqat.',
      de: 'Vollziehen Sie Ghusl (Ganzkörperwaschung), legen Sie das Ihram-Gewand an und fassen Sie die Absicht am Meeqat.',
      tr: 'Gusül abdesti alın, ihram kıyafetlerini giyin ve Mikat sınırında niyet edin.',
      pt: 'Realize o ghusl, vista as vestimentas de Ihram e formule a intenção no limite (Meeqat).'
    },
    instruction: {
      en: 'For Umrah, say the Niyyah and begin reciting the Talbiyah continuously until you reach Masjid al-Haram.',
      es: 'Para la Umrah, pronuncia la Niyyah y comienza a recitar la Talbiyah de forma continua hasta llegar a la Mezquita Al-Haram.',
      ar: 'انطق بنية العمرة وابدأ بتلاوة التلبية بصوت مرتفع للرجال ومنخفض للنساء بشكل مستمر حتى دخول المسجد الحرام.',
      fr: 'Prononcez la Niyyah pour l’Omra, puis récitez la Talbiyah continuellement jusqu’à l’entrée du Masjid al-Haram.',
      de: 'Sprechen Sie die Absichtsformel für die Umrah und rezitieren Sie die Talbiyah ununterbrochen, bis Sie die Al-Haram-Moschee erreichen.',
      tr: 'Umre niyetini yapın ve Mescid-i Haram\'a ulaşana kadar sürekli Telbiye duasını okuyun.',
      pt: 'Para a Umrah, pronuncie a Niyyah e comece a recitar a Talbiyah continuamente até chegar à Mesquita Al-Haram.'
    },
    duas: [
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ عُمْرَةً',
        transliteration: 'Labbayk Allahumma Umrah',
        translation: {
          en: 'Here I am, O Allah, for Umrah.',
          es: 'Aquí estoy, oh Allah, para realizar la Umrah.',
          ar: 'لبيك اللهم بأداء عمرة.',
          fr: 'Me voici, ô Allah, pour une Omra.',
          de: 'Hier bin ich, o Allah, für die Umrah.',
          tr: 'Buyur Allah\'ım, umre yapmak üzere huzurundayım.',
          pt: 'Aqui estou, ó Allah, para realizar a Umrah.'
        }
      },
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
        transliteration: 'Labbayk Allahumma labbayk, labbayk la sharika laka labbayk, innal-hamda wan-ni\'mata laka wal-mulk, la sharika lak.',
        translation: {
          en: 'Here I am, O Allah, here I am. Here I am, You have no partner, here I am. Surely all praise, grace, and dominion are Yours. You have no partner.',
          es: 'Aquí estoy, oh Allah, aquí estoy. Aquí estoy, no tienes asociados, aquí estoy. Ciertamente toda alabanza, gracia y soberanía son Tuyas. No tienes asociados.',
          ar: 'التلبية: إجابة لدعوة الله وإقراراً بتوحيده والاعتراف بنعمه الملك والحمد والثناء العظيم له وحده لا شريك له.',
          fr: 'Me voici, ô Allah, me voici. Me voici, Tu n’as aucun associé, me voici. Certes la louange, la grâce et la royauté T’appartiennent. Tu n’as aucun associé.',
          de: 'Hier bin ich, o Allah, hier bin ich. Hier bin ich, Du hast keinen Partner, hier bin ich. Gewiss gebührt alles Lob, jede Gnade und die Herrschaft Dir. Du hast keinen Partner.',
          tr: 'Buyur Allah\'ım buyur! Buyur, senin hiçbir ortağın yoktur, buyur! Şüphesiz hamd de nimet de senindir, mülk de senindir. Senin ortağın yoktur.',
          pt: 'Aqui estou, ó Allah, aqui estou. Aqui estou, Tu não tens parceiros, aqui estou. Certamente todo louvor, graça e soberania são Teus. Tu não tens parceiros.'
        }
      }
    ]
  },
  {
    id: 'u_enter_masjid',
    number: 2,
    title: {
      en: 'Entering Masjid al-Haram',
      es: 'Entrar en la Mezquita Al-Haram',
      ar: 'دخول المسجد الحرام',
      fr: 'Entrer au Masjid al-Haram',
      de: 'Betreten der Al-Haram-Moschee',
      tr: 'Mescid-i Haram\'a Giriş',
      pt: 'Entrar na Mesquita Al-Haram'
    },
    description: {
      en: 'Enter with your right foot first and recite the invocation for entering the mosque.',
      es: 'Entra primero con el pie derecho y recita la invocación para ingresar a la mezquita.',
      ar: 'دخول المسجد بالقدم اليمنى أولاً واستشعار عظمة بيت الله الحرام مع قراءة دعاء دخول المسجد.',
      fr: 'Entrer en avançant le pied droit en premier et réciter l’invocation d’entrée à la mosquée.',
      de: 'Betreten Sie die Moschee mit dem rechten Fuß zuerst und sprechen Sie das Bittgebet für das Betreten einer Moschee.',
      tr: 'Mescide sağ ayağınızla girin ve mescide giriş duasını okuyun.',
      pt: 'Entre primeiro com o pé direito e recite a invocação para entrar na mesquita.'
    },
    instruction: {
      en: 'Keep your eyes downcast until you see the Kaaba, then make whatever Dua you wish, as the first sight of the Kaaba is a time of accepted supplication.',
      es: 'Mantén la mirada baja hasta que veas la Kaaba, luego realiza la súplica que desees, ya que el primer avistamiento de la Kaaba es un momento de súplicas aceptadas.',
      ar: 'احرص على غض البصر حتى تقع عينك على الكعبة المشرفة، وعند رؤيتها كبّر وهلّل وادعُ بما تشاء، فإن الدعاء عند أول رؤية مستجاب.',
      fr: 'Gardez le regard baissé jusqu’à voir la Kaaba. Faites alors l’invocation de votre choix, car la première vue de la Kaaba est un moment privilégié où les prières sont exaucées.',
      de: 'Halten Sie Ihren Blick gesenkt, bis Sie die Kaaba sehen. Sprechen Sie dann ein beliebiges Dua, da Bittgebete beim ersten Anblick der Kaaba erhört werden.',
      tr: 'Kabe\'yi görene kadar gözlerinizi aşağıda tutun. Kabe\'yi ilk kez gördüğünüzde dilediğiniz gibi dua edin, çünkü Kabe\'yi ilk görüş anında yapılan dualar kabul olunur.',
      pt: 'Mantenha os olhos baixos até ver a Kaaba, e faça a súplica que desejar, pois o primeiro vislumbre da Kaaba é um momento de súplicas aceitas.'
    },
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ، وَالصَّلَاةُ وَالسَّلَامُ عَلَى رَسُولِ اللَّهِ، اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
        transliteration: 'Bismillah, was-salatu was-salamu \'ala Rasoolillah. Allahumma-ftah li abwaba rahmatik.',
        translation: {
          en: 'In the name of Allah, and peace and blessings be upon the Messenger of Allah. O Allah, open for me the gates of Your mercy.',
          es: 'En el nombre de Allah, y que la paz y las bendiciones sean con el Mensajero de Allah. Oh Allah, ábreme las puertas de Tu misericordia.',
          ar: 'باسم الله، والصلاة والسلام على رسول الله، اللهم افتح لي أبواب رحمتك وفضلك.',
          fr: 'Au nom d’Allah, et que la paix et les bénédictions soient sur le Messager d’Allah. Ô Allah, ouvre-moi les portes de Ta miséricorde.',
          de: 'Im Namen Allahs, Segen und Frieden seien auf dem Gesandten Allahs. O Allah, öffne mir die Tore Deiner Barmherzigkeit.',
          tr: 'Allah\'ın adıyla. Salat ve selam Allah\'ın Resulü\'nün üzerine olsun. Allah\'ım, bana rahmet kapılarını aç.',
          pt: 'Em nome de Allah, e que a paz e as bênçãos estejam com o Mensageiro de Allah. Ó Allah, abre para mim as portas da Tua misericórdia.'
        }
      }
    ]
  },
  {
    id: 'u_tawaf',
    number: 3,
    title: {
      en: 'Tawaf (7 Rounds)',
      es: 'Tawaf (7 Vueltas)',
      ar: 'الطواف حول الكعبة',
      fr: 'Tawaf (7 Tours)',
      de: 'Tawaf (7 Runden)',
      tr: 'Tavaf (7 Şavt)',
      pt: 'Tawaf (7 Voltas)'
    },
    description: {
      en: 'Circumambulate the Kaaba seven times counter-clockwise, beginning from the Black Stone (Hajar al-Aswad).',
      es: 'Circunvala la Kaaba siete veces en sentido contrario a las agujas del reloj, comenzando desde la Piedra Negra (Hajar al-Aswad).',
      ar: 'الطواف حول الكعبة المشرفة سبعة أشواط بدءاً من الحجر الأسود وانتهاءً به، مع استحضار الذكر والدعاء.',
      fr: 'Faire sept tours de la Kaaba dans le sens inverse des aiguilles d’une montre, en commençant par la Pierre Noire (Hajar al-Aswad).',
      de: 'Umrunden Sie die Kaaba siebenmal gegen den Uhrzeigersinn, beginnend am Schwarzen Stein (Hajar al-Aswad).',
      tr: 'Kabe\'nin etrafında, Hacerü\'l-Esved\'den başlayarak saat yönünün tersine yedi kez dönün.',
      pt: 'Circunde a Kaaba sete vezes no sentido anti-horário, começando pela Pedra Negra (Hajar al-Aswad).'
    },
    instruction: {
      en: 'For men, expose the right shoulder (Idtiba\') and jog the first three rounds (Raml) if space permits. Touch or point to the Black Stone saying "Allahu Akbar" to start each round.',
      es: 'Para los hombres, descubran el hombro derecho (Idtiba\') y troten las primeras tres vueltas (Raml) si el espacio lo permite. Toquen o apunten a la Piedra Negra diciendo "Allahu Akbar" para iniciar cada vuelta.',
      ar: 'للرجال: يُسن الاضطباع (كشف الكتف الأيمن) والرمل (الهرولة الخفيفة في الأشواط الثلاثة الأولى). أشر إلى الحجر الأسود وكبّر لبدء كل شوط.',
      fr: 'Pour les hommes, découvrez l’épaule droite (Idtiba\') et effectuez les trois premiers tours à pas pressés (Raml) si l’espace le permet. Touchez ou pointez la Pierre Noire en disant "Allahu Akbar" au début de chaque tour.',
      de: 'Für Männer: Entblößen Sie die rechte Schulter (Idtiba\') und eilen Sie in den ersten drei Runden (Raml) leicht, wenn es der Platz erlaubt. Berühren oder zeigen Sie auf den Schwarzen Stein und sagen Sie „Allahu Akbar“ bei jeder Runde.',
      tr: 'Erkekler için sağ omzu açıkta bırakmak (İztiba) ve kalabalık izin verirse ilk üç şavtta hızlı yürümek (Remel) sünnettir. Her şavta başlarken Hacerü\'l-Esved\'i selamlayıp "Allahu Ekber" deyin.',
      pt: 'Para os homens, descubram o ombro direito (Idtiba\') e trotem nas primeiras três voltas (Raml) se o espaço permitir. Toque ou aponte para a Pedra Negra dizendo "Allahu Akbar" para iniciar cada volta.'
    },
    duas: [
      {
        arabic: 'بِسْمِ اللَّهِ وَاللَّهُ أَكْبَرُ',
        transliteration: 'Bismillahi wal-Lahu Akbar',
        translation: {
          en: 'In the name of Allah, and Allah is the Greatest (recited when pointing to the Black Stone).',
          es: 'En el nombre de Allah, y Allah es el más Grande (se recita al señalar la Piedra Negra).',
          ar: 'يُقال عند محاذاة الحجر الأسود في بداية كل شوط.',
          fr: 'Au nom d’Allah, et Allah est le plus Grand (prononcé en pointant la Pierre Noire).',
          de: 'Im Namen Allahs, und Allah ist der Größte (gesprochen beim Zeigen auf den Schwarzen Stein).',
          tr: 'Allah\'ın adıyla, Allah en büyüktür (Hacerü\'l-Esved\'i selamlerken söylenir).',
          pt: 'Em nome de Allah, e Allah é o Maior (recitado ao apontar para a Pedra Negra).'
        }
      },
      {
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        transliteration: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina \'adhaban-nar.',
        translation: {
          en: 'Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire. (Recited between the Yemeni Corner and the Black Stone).',
          es: 'Señor nuestro, danos en esta vida lo que es bueno y en la Otra lo que es bueno, y presérvanos del castigo del Fuego. (Se recita entre la Esquina Yemení y la Piedra Negra).',
          ar: 'يُستحب الدعاء به بين الركن اليماني والحجر الأسود.',
          fr: 'Notre Seigneur ! Accorde-nous belle part ici-bas, et belle part aussi dans l’au-delà ; et protège-nous du châtiment du Feu. (Récité entre le Coin Yéménite et la Pierre Noire).',
          de: 'Unser Herr, gewähre uns im Diesseits Gutes und im Jenseits Gutes, und bewahre uns vor der Strafe des Feuers. (Rezitiert zwischen der Jemenitischen Ecke und dem Schwarzen Stein).',
          tr: 'Rabbimiz, bize dünyada da iyilik ver, ahirette de iyilik ver ve bizi ateşin azabından koru. (Rükn-i Yemani ile Hacerü\'l-Esved arasında okunur).',
          pt: 'Nosso Senhor, concede-nos neste mundo o que é bom e no Outro o que é bom, e protege-nos do castigo do Fogo. (Recitado entre o Canto Iemenita e a Pedra Negra).'
        }
      }
    ]
  },
  {
    id: 'u_maqam',
    number: 4,
    title: {
      en: 'Maqam Ibrahim (Station of Abraham)',
      es: 'Maqam Ibrahim (Estación de Abraham)',
      ar: 'مقام إبراهيم',
      fr: 'Maqam Ibrahim (Station d’Abraham)',
      de: 'Maqam Ibrahim (Stätte Abrahams)',
      tr: 'Makam-ı İbrahim\'de Namaz',
      pt: 'Maqam Ibrahim (Estação de Abraão)'
    },
    description: {
      en: 'Pray two voluntary Rak\'ahs behind Maqam Ibrahim if possible, or anywhere in the Haram.',
      es: 'Reza dos Rak\'ahs voluntarias detrás de Maqam Ibrahim si es posible, o en cualquier parte del Haram.',
      ar: 'صلاة ركعتين خلف مقام إبراهيم عليه السلام أو في أي مكان متاح بالمسجد الحرام بعد الطواف.',
      fr: 'Prier deux Rak\'ahs derrière la station d’Abraham si possible, ou n’importe où dans la mosquée.',
      de: 'Beten Sie zwei Rakahs hinter der Stätte Abrahams (Maqam Ibrahim) oder an einem beliebigen freien Ort in der Moschee.',
      tr: 'Mümkünse Makam-ı İbrahim\'in arkasında, değilse Mescid-i Haram\'ın uygun bir yerinde iki rekat tavaf namazı kılın.',
      pt: 'Reze duas Rak\'ahs voluntárias atrás do Maqam Ibrahim, se possível, ou em qualquer lugar da Mesquita.'
    },
    instruction: {
      en: 'Recite Surah Al-Kafirun in the first Rak\'ah and Surah Al-Ikhlas in the second Rak\'ah.',
      es: 'Recita la Sura Al-Kafirun en la primera Rak\'ah y la Sura Al-Ikhlas en la segunda Rak\'ah.',
      ar: 'يُستحب قراءة سورة الكافرون في الركعة الأولى وسورة الإخلاص في الركعة الثانية.',
      fr: 'Il est recommandé de réciter Sourate Al-Kafirun au premier cycle, et Sourate Al-Ikhlas au second.',
      de: 'Es ist Sunnah, in der ersten Rakah Surah Al-Kafirun und in der zweiten Rakah Surah Al-Ikhlas zu rezitieren.',
      tr: 'İlk rekatta Kafirun suresini, ikinci rekatta ise İhlas suresini okumak sünnettir.',
      pt: 'Recite a Surata Al-Kafirun na primeira Rak\'ah e a Surata Al-Ikhlas na segunda Rak\'ah.'
    },
    duas: [
      {
        arabic: 'وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى',
        transliteration: 'Wa-ttakhidhu min maqami Ibrahima musalla.',
        translation: {
          en: 'And take, [O believers], from the standing place of Abraham a place of prayer. (Recite when walking towards Maqam Ibrahim).',
          es: 'Y tomen la estación de Abraham como lugar de oración. (Recitar al dirigirse al Maqam Ibrahim).',
          ar: 'تُقرأ عند التوجه إلى خلف مقام إبراهيم لصلاة الركعتين.',
          fr: 'Et adoptez la station d’Abraham comme lieu de prière. (À réciter en se dirigeant vers le Maqam Ibrahim).',
          de: 'Und nehmt die Stätte Abrahams als Gebetsort. (Rezitiert auf dem Weg zum Maqam Ibrahim).',
          tr: 'Siz de İbrahim\'in makamından bir namaz yeri edinin. (Makam-ı İbrahim\'e doğru yürürken okunur).',
          pt: 'E adotai a estação de Abraão como local de oração. (Recitar ao se dirigir ao Maqam Ibrahim).'
        }
      }
    ]
  },
  {
    id: 'u_zamzam',
    number: 5,
    title: {
      en: 'Drink Zamzam Water',
      es: 'Beber Agua de Zamzam',
      ar: 'شرب ماء زمزم',
      fr: 'Boire l’eau de Zamzam',
      de: 'Zamzam-Wasser trinken',
      tr: 'Zamzam Suyu İçmek',
      pt: 'Beber Água de Zamzam'
    },
    description: {
      en: 'Go to the Zamzam water fountains, drink your fill while standing, and pour some over your head.',
      es: 'Dirígete a las fuentes de agua de Zamzam, bebe de pie hasta saciarte y vierte un poco sobre tu cabeza.',
      ar: 'التوجه إلى مشارب زمزم، والشرب منه واقفاً مستقبل القبلة مع التسمية والدعاء بطلب العلم النافع والشفاء.',
      fr: 'Se rendre aux fontaines de Zamzam, boire à satiété debout, et s’en verser un peu sur la tête.',
      de: 'Gehen Sie zu den Zamzam-Brunnen, trinken Sie im Stehen reichlich und gießen Sie sich etwas Wasser über den Kopf.',
      tr: 'Zemzem çeşmelerine gidin, ayakta kıbleye dönerek doya doya için ve başınıza biraz dökün.',
      pt: 'Dirija-se às fontes de água de Zamzam, beba de pé até saciar-se e derrame um pouco sobre a cabeça.'
    },
    instruction: {
      en: 'Face the Kaaba, say Bismillah, drink in three breaths, and make Du\'a. The water of Zamzam is for whatever purpose it is drunk for.',
      es: 'Mira hacia la Kaaba, di Bismillah, bebe en tres sorbos y realiza la súplica. El agua de Zamzam sirve para cualquier propósito por el que se beba.',
      ar: 'استقبل الكعبة، وسمّ الله، واشرب على ثلاثة أنفاس، ثم ادعُ بما تشاء من خير الدنيا والآخرة.',
      fr: 'Faire face à la Kaaba, dire Bismillah, boire en trois gorgées et faire des douas. L’eau de Zamzam est utile à ce pour quoi elle est bue.',
      de: 'Wenden Sie sich der Kaaba zu, sagen Sie Bismillah, trinken Sie in drei Zügen und sprechen Sie ein Dua. Das Zamzam-Wasser erfüllt den Zweck, für den es getrunken wird.',
      tr: 'Kabe\'ye dönün, Bismillah deyin, üç yudumda için ve dua edin. Zemzem suyu ne niyetle içilirse ona şifadır.',
      pt: 'Vire-se para a Kaaba, diga Bismillah, beba em três goles e faça a súplica. A água de Zamzam serve para o propósito pelo qual é bebida.'
    },
    duas: [
      {
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا وَسِعًا وَشِفَاءً مِنْ كُلِّ دَاءٍ',
        transliteration: 'Allahumma inni as\'aluka \'ilman nafi\'an wa rizqan wasi\'an wa shifa\'an min kulli da\'.',
        translation: {
          en: 'O Allah, I ask You for beneficial knowledge, abundant provision, and healing from every illness.',
          es: 'Oh Allah, Te pido conocimiento beneficioso, provisión abundante y cura para toda enfermedad.',
          ar: 'دعاء مأثور عن ابن عباس رضي الله عنهما عند شرب ماء زمزم.',
          fr: 'Ô Allah, je Te demande un savoir utile, une subsistance abondante et la guérison de tout mal.',
          de: 'O Allah, ich bitte Dich um nützliches Wissen, reichliche Versorgung und Heilung von jeder Krankheit.',
          tr: 'Allah\'ım! Senden faydalı ilim, bol rızık ve her türlü hastalıktan şifa diliyorum.',
          pt: 'Ó Allah, peço-Te conhecimento benéfico, provisão abundante e cura para toda doença.'
        }
      }
    ]
  },
  {
    id: 'u_sai',
    number: 6,
    title: {
      en: 'Sa\'i (Safa and Marwa)',
      es: 'Sa\'i (Safa y Marwa)',
      ar: 'السعي بين الصفا والمروة',
      fr: 'Sa’i (Safa & Marwa)',
      de: 'Sa\'i (Safa und Marwa)',
      tr: 'Sa\'y (Safa ve Merve)',
      pt: 'Sa\'i (Safa e Marwa)'
    },
    description: {
      en: 'Walk seven laps between the hills of Safa and Marwa, starting at Safa and ending at Marwa.',
      es: 'Camina siete vueltas entre las colinas de Safa y Marwa, comenzando en Safa y terminando en Marwa.',
      ar: 'السعي بين جبلي الصفا والمروة سبعة أشواط، يبدأ الشوط الأول من الصفا وينتهي السابع عند المروة.',
      fr: 'Parcourir sept trajets entre les collines de Safa et Marwa, en commençant à Safa et en terminant à Marwa.',
      de: 'Laufen Sie siebenmal zwischen den Hügeln Safa und Marwa hin und her, beginnend bei Safa und endend bei Marwa.',
      tr: 'Safa ile Merve tepeleri arasında Safa\'dan başlayıp Merve\'de bitecek şekilde yedi tur yürüyün.',
      pt: 'Caminhe sete voltas entre as colinas de Safa e Marwa, começando em Safa e terminando em Marwa.'
    },
    instruction: {
      en: 'Upon ascending Safa, face the Kaaba and recite the Quranic verse, then make Dua. Walk normally, but jog between the green light markers (for men). Repeat the supplications on Marwa.',
      es: 'Al subir a Safa, mira hacia la Kaaba, recita el versículo coránico y realiza la súplica. Camina normalmente, pero trota entre los marcadores de luz verde (para hombres). Repite las súplicas en Marwa.',
      ar: 'عند الصعود إلى الصفا والمروة استقبل القبلة واقرأ الآية القرآنية ثم ادعُ بخشوع. للرجال: يسن الجري الخفيف بين الضوءين الأخضرين.',
      fr: 'En montant sur Safa, faites face à la Kaaba, récitez le verset coranique et faites des douas. Marchez normalement, mais trotez entre les repères verts (hommes). Répétez sur Marwa.',
      de: 'Nach dem Besteigen von Safa blicken Sie zur Kaaba, rezitieren den Koranvers und sprechen ein Dua. Gehen Sie normal, laufen Sie jedoch zwischen den grünen Markierungen schneller (für Männer). Wiederholen Sie dies auf Marwa.',
      tr: 'Safa tepesine çıktığınızda Kabe\'ye dönüp ilgili ayeti okuyun ve dua edin. Normal yürüyün, ancak yeşil ışıklı direkler arasında (erkekler için) hızlı koşun. Merve\'ye ulaştığınızda duaları tekrarlayın.',
      pt: 'Ao subir a Safa, vire-se para a Kaaba, recite o versículo corânico e faça a súplica. Caminhe normalmente, mas trote entre os marcadores de luz verde (para homens). Repita as súplicas em Marwa.'
    },
    duas: [
      {
        arabic: 'إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللَّهِ، فَمَنْ حَجَّ الْبَيْتَ أَوِ اعْتَمَرَ فَلَا جُنَاحَ عَلَيْهِ أَنْ يَطَّوَّفَ بِهِمَا، وَمَنْ تَطَوَّعَ خَيْرًا فَإِنَّ اللَّهَ شَاكِرٌ عَلِيمٌ',
        transliteration: 'Innas-Safa wal-Marwata min sha\'a\'irillah. Famal hajjal-bayta awi\'tamara fala junaha \'alayhi ay-yattawafa bihima. Wa man tatawwa\'a khayran fa-innallaha Shakirun \'Aleem.',
        translation: {
          en: 'Indeed, Safa and Marwa are among the symbols of Allah. So whoever makes Hajj to the House or performs Umrah - there is no blame upon him for walking between them. And whoever volunteers good - then indeed, Allah is appreciative and Knowing.',
          es: 'Ciertamente Safa y Marwa se encuentran entre los símbolos de Allah. Así que quien haga el Hajj a la Casa o realice la Umrah, no tiene culpa en caminar entre ellos. Y quien hace el bien voluntariamente, entonces ciertamente Allah es Agradecido y Omnisciente.',
          ar: 'تُقرأ عند الاقتراب من جبل الصفا لبدء السعي وعند صعوده.',
          fr: 'Certes, Safa et Marwa sont parmi les rituels d’Allah. Donc, quiconque fait le Hajj à la Maison ou fait l’Omra ne commet pas de péché en faisant le va-et-vient entre ces deux collines. Et quiconque fait le bien de son propre gré, alors Allah est Reconnaissant, Omniscient.',
          de: 'Gewiss gehören Safa und Marwa zu den Kultsymbolen Allahs. Wer also zum Hause pilgert oder die Umrah vollzieht, für den ist es keine Sünde, sie zu umrunden. Und wer freiwillig Gutes tut, gewiss, Allah ist dankbar und allwissend.',
          tr: 'Şüphe yok ki, Safa ile Merve Allah\'ın nişanelerindendir. Her kim hac veya umre niyetiyle Kabe\'yi ziyaret ederse, bu ikisini tavaf etmesinde bir sakınca yoktur. Kim gönlünden koparak bir hayır işlerse, şüphesiz Allah şükrün karşılığını veren ve bilendir.',
          pt: 'Certamente, Safa e Marwa estão entre os símbolos de Allah. Portanto, quem fizer a peregrinação à Casa ou realizar a Umrah - não há pecado em caminhar entre eles. E quem fizer o bem voluntariamente - então, certamente, Allah é Agradecido e Omnisciente.'
        }
      }
    ]
  },
  {
    id: 'u_halq',
    number: 7,
    title: {
      en: 'Halq or Taqsir (Shaving/Cutting Hair)',
      es: 'Halq o Taqsir (Afeitado/Corte de Pelo)',
      ar: 'الحلق أو التقصير',
      fr: 'Halq ou Taqsir (Rasage/Coupe)',
      de: 'Halq oder Taqsir (Rasieren/Kürzen)',
      tr: 'Tıraş Olup İhramdan Çıkış',
      pt: 'Halq ou Taqsir (Barbear/Cortar Cabelo)'
    },
    description: {
      en: 'Conclude the Umrah by shaving the head (Halq) or cutting hair short (Taqsir).',
      es: 'Concluye la Umrah afeitándote la cabeza (Halq) o cortándote el pelo corto (Taqsir).',
      ar: 'حلق شعر الرأس كاملاً (للرجال وهو الأفضل) أو تقصيره من جميع جوانبه، وتقصير قدر أنملة للنساء للإعلان عن انتهاء العمرة والتحلل.',
      fr: 'Terminer l’Omra en se rasant la tête (Halq) ou en coupant les cheveux courts (Taqsir).',
      de: 'Schließen Sie die Umrah ab, indem Sie den Kopf rasieren (Halq) oder das Haar kürzen (Taqsir).',
      tr: 'Erkeklerin saçlarını tamamen kazıtması (Halk) veya kısaltması (Taksir), kadınların ise saç uçlarından biraz kesmesi ile ihramdan çıkılır.',
      pt: 'Conclua a Umrah raspando a cabeça (Halq) ou cortando o cabelo curto (Taqsir).'
    },
    instruction: {
      en: 'For men, shaving is highly recommended. For women, they must cut only the length of a fingertip from their hair. Once done, you exit the state of Ihram, and all restrictions are lifted.',
      es: 'Para los hombres, afeitarse es muy recomendado. Para las mujeres, deben cortar solo el largo de una yema del dedo de su cabello. Una vez hecho esto, sales del estado de Ihram y se levantan todas las restricciones.',
      ar: 'للرجال الحلق أفضل، وللنساء قص مقدار عقدة إصبع من أطراف الشعر. بعد ذلك يتحلل المحرم تماماً من إحرامه ويحل له كل ما كان محظوراً.',
      fr: 'Pour les hommes, le rasage est recommandé. Pour les femmes, il suffit de couper la longueur d’une phalange. Une fois fait, vous sortez de l’état d’Ihram.',
      de: 'Für Männer wird das Rasieren empfohlen. Frauen kürzen ihr Haar nur um eine Fingerkuppenlänge. Danach ist der Zustand des Ihram beendet und alle Einschränkungen sind aufgehoben.',
      tr: 'Erkekler için tıraş olmak daha faziletlidir. Kadınlar saçlarının ucundan parmak boğumu kadar keserler. Bu işlemle ihramdan çıkılmış olur.',
      pt: 'Para os homens, raspar é altamente recomendado. Para as mulheres, devem cortar apenas o comprimento de uma ponta de dedo do cabelo. Uma vez feito, você sai do estado de Ihram.'
    },
    duas: [
      {
        arabic: 'الْحَمْدُ لِلَّهِ الَّذِي قَضَى عَنَّا مَنَاسِكَنَا، اللَّهُمَّ زِدْنَا إِيمَانًا وَيَقِينًا وَتَوْفِيقًا وَعَوْنًا',
        transliteration: 'Alhamdu lillahil-ladhi qada \'anna manasikana. Allahumma zidna imanan wa yaqinan wa tawfiqan wa \'awna.',
        translation: {
          en: 'Praise be to Allah who has completed our rituals for us. O Allah, increase us in faith, certainty, guidance, and assistance.',
          es: 'Alabado sea Allah quien ha completado nuestros rituales por nosotros. Oh Allah, auméntanos en fe, certeza, guía y asistencia.',
          ar: 'حمد الله على التمام وسؤال القبول والزيادة في الدين بعد الفراغ من مناسك العمرة.',
          fr: 'Louange à Allah qui a parachevé nos rituels. Ô Allah, augmente notre foi, notre certitude, notre réussite et notre aide.',
          de: 'Alles Lob gebührt Allah, der unsere Riten für uns vollendet hat. O Allah, mehre uns im Glauben, in der Gewissheit und der Unterstützung.',
          tr: 'İbadetlerimizi tamamlamayı nasip eden Allah\'a hamdolsun. Allah\'ım, imanımızı, yakinimizi, muvaffakiyetimizi ve yardımını artır.',
          pt: 'Louvado seja Allah que completou nossos rituais por nós. Ó Allah, aumenta-nos em fé, certeza, orientação e assistência.'
        }
      }
    ]
  }
];

const HAJJ_STEPS: RitualStep[] = [
  {
    id: 'h_ihram',
    number: 1,
    title: {
      en: 'Ihram (8th of Dhul-Hijjah)',
      es: 'Ihram (8 de Dhul-Hijjah)',
      ar: 'الإحرام للحج',
      fr: 'Ihram (8 Dhul-Hijjah)',
      de: 'Ihram (8. Dhul-Hidschah)',
      tr: 'İhram ve Hac Niyeti',
      pt: 'Ihram (8 de Dhul-Hijjah)'
    },
    description: {
      en: 'Enter into Ihram from your place of residence in Mecca and state your intention for Hajj.',
      es: 'Entra en Ihram desde tu lugar de residencia en La Meca y declara tu intención para el Hajj.',
      ar: 'الإحرام للحج من مكان الإقامة بمكة المكرمة في صباح يوم التروية والاغتسال والتلبية.',
      fr: 'Entrer en état d’Ihram depuis votre lieu de résidence à la Mecque et formuler l’intention pour le Hajj.',
      de: 'Treten Sie an Ihrem Aufenthaltsort in Mekka in den Ihram ein und fassen Sie die Absicht für den Hajj.',
      tr: 'Mekke\'de kaldığınız yerde ihrama girin ve Hac niyetini yapın.',
      pt: 'Entre em Ihram a partir do seu local de residência em Meca e declare sua intenção para o Hajj.'
    },
    instruction: {
      en: 'Perform ghusl, put on Ihram clothes, and say the Niyyah. Begin reciting the Talbiyah out loud (for men).',
      es: 'Realiza el gusl, ponte la ropa de Ihram y di la Niyyah. Comienza a recitar la Talbiyah en voz alta (para hombres).',
      ar: 'الاغتسال والتطيب ولبس ملابس الإحram وعقد النية والبدء في التلبية كشعار للحج.',
      fr: 'Faire le ghusl, revêtir les habits d’Ihram, formuler la Niyyah et réciter à haute voix la Talbiyah (hommes).',
      de: 'Vollziehen Sie Ghusl, legen Sie die Ihram-Kleidung an und sprechen Sie die Niyyah. Rezitieren Sie laut die Talbiyah.',
      tr: 'Gusül abdesti alın, ihram elbiselerini giyin, niyet edin ve yüksek sesle Telbiye okumaya başlayın.',
      pt: 'Realize o ghusl, vista as roupas de Ihram e pronuncie a Niyyah. Comece a recitar a Talbiyah em voz alta.'
    },
    duas: [
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ حَجًّا',
        transliteration: 'Labbayk Allahumma Hajjan',
        translation: {
          en: 'Here I am, O Allah, for Hajj.',
          es: 'Aquí estoy, oh Allah, para realizar el Hajj.',
          ar: 'اللهم لبيك أداء فريضة الحج.',
          fr: 'Me voici, ô Allah, pour le Hajj.',
          de: 'Hier bin ich, o Allah, für den Hajj.',
          tr: 'Buyur Allah\'ım, hac yapmak üzere huzurundayım.',
          pt: 'Aqui estou, ó Allah, para realizar o Hajj.'
        }
      },
      {
        arabic: 'لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ',
        transliteration: 'Labbayk Allahumma labbayk...',
        translation: {
          en: 'Here I am, O Allah, here I am... (Recite continuously throughout Hajj journeys).',
          es: 'Aquí estoy, oh Allah, aquí estoy... (Recita continuamente durante los traslados del Hajj).',
          ar: 'تكرار التلبية في جميع الانتقالات.',
          fr: 'Me voici, ô Allah, me voici... (À répéter durant tout le pèlerinage).',
          de: 'Hier bin ich, o Allah, hier bin ich... (Während der gesamten Reise fortlaufend rezitieren).',
          tr: 'Buyur Allah\'ım buyur... (Hac yolculukları boyunca sürekli okunur).',
          pt: 'Aqui estou, ó Allah, aqui estou... (Recite continuamente durante os trajetos do Hajj).'
        }
      }
    ]
  },
  {
    id: 'h_mina',
    number: 2,
    title: {
      en: 'Mina (8th of Dhul-Hijjah)',
      es: 'Mina (8 de Dhul-Hijjah)',
      ar: 'يوم التروية في منى',
      fr: 'Mina (8 Dhul-Hijjah)',
      de: 'Mina (8. Dhul-Hidschah)',
      tr: 'Mina\'ya Hareket ve Geceleme',
      pt: 'Mina (8 de Dhul-Hijjah)'
    },
    description: {
      en: 'Go to Mina before Dhuhr prayer and spend the day and night there praying shortened prayers.',
      es: 'Dirígete a Mina antes del rezo de Dhuhr y pasa el día y la noche allí rezando oraciones acortadas.',
      ar: 'الذهاب إلى منى قبل الظهر وقضاء يوم التروية والمبيت بها وصلاة الظهر والعصر والمغرب والعشاء والفجر قصراً دون جمع.',
      fr: 'Se rendre à Mina avant la prière de Dhuhr, y passer la journée et la nuit en effectuant les prières raccourcies.',
      de: 'Begeben Sie sich vor dem Dhuhr-Gebet nach Mina und verbringen Sie dort Tag und Nacht mit verkürzten Gebeten.',
      tr: 'Öğle namazından önce Mina\'ya gidin. Beş vakit namazı (öğle, ikindi, akşam, yatsı ve ertesi günün sabah namazını) burada kısaltarak kılın.',
      pt: 'Dirija-se a Mina antes da oração de Dhuhr e passe o dia e a noite lá realizando orações encurtadas.'
    },
    instruction: {
      en: 'Pray Dhuhr, Asr, Maghrib, Isha, and Fajr of the next day. Shorten the 4-rakah prayers to 2, but do not combine them.',
      es: 'Reza Dhuhr, Asr, Maghrib, Isha y el Fajr del día siguiente. Acorta las oraciones de 4 rakahs a 2, pero no las combines.',
      ar: 'صلاة كل صلاة في وقتها مع قصر الصلوات الرباعية إلى ركعتين دون الجمع بين الصلوات.',
      fr: 'Prier Dhuhr, Asr, Maghrib, Isha et le Fajr du lendemain. Réduire les prières de 4 cycles à 2, mais sans les regrouper.',
      de: 'Beten Sie Dhuhr, Asr, Maghrib, Isha und das Fajr des nächsten Tages. Verkürzen Sie die 4-Rakah-Gebete auf 2, aber fassen Sie sie nicht zusammen.',
      tr: 'Öğle, ikindi, akşam, yatsı ve sabah namazlarını kendi vakitlerinde kılın. 4 rekatlık namazları 2 rekat olarak kılın (Cem etmeyin).',
      pt: 'Reze Dhuhr, Asr, Maghrib, Isha e o Fajr do dia seguinte. Encurte as orações de 4 rakahs para 2, mas não as combine.'
    },
    duas: []
  },
  {
    id: 'h_arafat',
    number: 3,
    title: {
      en: 'Arafat (9th of Dhul-Hijjah)',
      es: 'Arafat (9 de Dhul-Hijjah)',
      ar: 'الوقوف بعرفة',
      fr: 'Arafat (9 Dhul-Hijjah)',
      de: 'Arafat (9. Dhul-Hidschah)',
      tr: 'Arafat Vakfesi',
      pt: 'Arafat (9 de Dhul-Hijjah)'
    },
    description: {
      en: 'Proceed to Mount Arafat after sunrise on the 9th. This standing is the climax of Hajj.',
      es: 'Procede al Monte Arafat después del amanecer del día 9. Esta estancia (Wuquf) es la cumbre del Hajj.',
      ar: 'التوجه إلى عرفات بعد شروق شمس التاسع والوقوف بها حتى غروب الشمس، وهو ركن الحج الأعظم.',
      fr: 'Se rendre au mont Arafat après le lever du soleil le 9. Cette station debout (Wuquf) est le cœur du Hajj.',
      de: 'Begeben Sie sich am 9. Tag nach Sonnenaufgang zum Berg Arafat. Das Stehen hier ist der Höhepunkt des Hajj.',
      tr: 'Zeval vaktinden sonra Arafat\'ta vakfe yapın. Bu vakfe Haccın en önemli farzıdır (Rüknüdür).',
      pt: 'Proceda ao Monte Arafat após o amanhecer do dia 9. Esta estadia (Wuquf) é o ápice do Hajj.'
    },
    instruction: {
      en: 'Pray Dhuhr and Asr combined and shortened during Dhuhr time. Spend the afternoon in intense Dua, repentance, and Dhikr facing the Qibla until sunset.',
      es: 'Reza Dhuhr y Asr combinados y acortados en el tiempo de Dhuhr. Pasa la tarde en súplica intensa, arrepentimiento y Dhikr de cara a la Qibla hasta el atardecer.',
      ar: 'صلاة الظهر والعصر جمع تقديم وقصراً في وقت الظهر. التفرغ الكامل للذكر والدعاء والتضرع لله مستقبل القبلة حتى المغرب.',
      fr: 'Prier Dhuhr et Asr regroupés et raccourcis à l’heure de Dhuhr. Passer l’après-midi en douas intenses, repentir et évocation face à la Qibla.',
      de: 'Beten Sie Dhuhr und Asr zusammengefasst und verkürzt zur Zeit des Dhuhr. Verbringen Sie den Nachmittag in intensivem Dua, Reue und Dhikr zur Qibla gewandt.',
      tr: 'Öğle ve ikindi namazlarını öğle vaktinde birleştirerek ve kısaltarak kılın (Cem-i Takdim). Gün batımına kadar Kabe yönüne dönerek dua ve istiğfar ile meşgul olun.',
      pt: 'Reze Dhuhr e Asr combinados e encurtados no horário de Dhuhr. Passe a tarde em súplica intensa, arrependimento e Dhikr voltado para a Qibla até o pôr do sol.'
    },
    duas: [
      {
        arabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration: 'La ilaha illa-Llahu wahdahu la sharika lahu, lahul-mulku wa lahul-hamdu, wa Huwa \'ala kulli shay\'in Qadeer.',
        translation: {
          en: 'There is no deity except Allah alone, without partner. To Him belongs dominion, and to Him belongs praise, and He is over all things competent. (The best supplication on the day of Arafah).',
          es: 'No hay más divinidad que Allah, Único, sin asociados. Suyo es el reino y Tuya es la alabanza, y Él es sobre todas las cosas Omnipotente. (La mejor súplica del día de Arafah).',
          ar: 'خير الدعاء دعاء يوم عرفة كما ورد عن النبي صلى الله عليه وسلم.',
          fr: 'Il n’y a pas de divinité en dehors d’Allah, l’Unique sans associé. À Lui la royauté et à Lui la louange, et Il est Puissant sur toute chose. (La meilleure supplication du jour d’Arafat).',
          de: 'Es gibt keinen Gott außer Allah allein, ohne Partner. Sein ist die Herrschaft, und Sein ist das Lob, und Er hat Macht über alle Dinge. (Das beste Bittgebet am Tage von Arafat).',
          tr: 'Allah\'tan başka ilah yoktur, O tektir, ortağı yoktur. Mülk O\'nundur, hamd O\'na mahsustur. O her şeye kadirdir. (Arafat günü yapılacak en hayırlı dua).',
          pt: 'Não há divindade senão Allah, Único, sem parceiros. Dele é o reino e Dele é o louvor, e Ele tem poder sobre todas as coisas. (A melhor súplica do dia de Arafat).'
        }
      }
    ]
  },
  {
    id: 'h_muzdalifah',
    number: 4,
    title: {
      en: 'Muzdalifah (Night of the 9th)',
      es: 'Muzdalifah (Noche del día 9)',
      ar: 'المبيت في مزدلفة',
      fr: 'Muzdalifah (Nuit du 9)',
      de: 'Muzdalifah (Nacht des 9.)',
      tr: 'Müzdelife\'ye Geçiş ve Vakfe',
      pt: 'Muzdalifah (Noite do dia 9)'
    },
    description: {
      en: 'Move to Muzdalifah after sunset without praying Maghrib at Arafat.',
      es: 'Muévete a Muzdalifah después del atardecer sin rezar Maghrib en Arafat.',
      ar: 'النفرة إلى مزدلفة بعد غروب شمس عرفة بهدوء وسكينة، والمبيت بها وصلاة المغرب والعشاء جمع تأخير وقصراً.',
      fr: 'Se diriger vers Muzdalifah après le coucher du soleil sans prier le Maghrib à Arafat.',
      de: 'Begeben Sie sich nach Sonnenuntergang nach Muzdalifah, ohne Maghrib auf Arafat zu beten.',
      tr: 'Arafat\'ta akşam namazını kılmadan gün batımından sonra Müzdelife\'ye doğru yola çıkın.',
      pt: 'Dirija-se a Muzdalifah após o pôr do sol sem realizar o Maghrib em Arafat.'
    },
    instruction: {
      en: 'Pray Maghrib and Isha combined and shortened (Isha to 2 rakahs) during Isha time in Muzdalifah. Sleep under the sky and collect at least 49 small pebbles for stoning.',
      es: 'Reza Maghrib e Isha combinados y acortados (Isha a 2 rakahs) durante el tiempo de Isha en Muzdalifah. Duerme bajo el cielo y recoge al menos 49 piedras pequeñas para el lanzamiento.',
      ar: 'صلاة المغرب والعشاء جمع تأخير وقصراً للعشاء. المبيت في مزدلفة وجمع حصيات رمي الجمار (على الأقل 49 حصاة صغيرة).',
      fr: 'Prier Maghrib et Isha regroupés et raccourcis à l’heure d’Isha à Muzdalifah. Dormir à la belle étoile et ramasser au moins 49 cailloux pour la lapidation.',
      de: 'Beten Sie Maghrib und Isha zusammengefasst und verkürzt zur Zeit des Isha in Muzdalifah. Schlafen Sie unter freiem Himmel und sammeln Sie mindestens 49 kleine Kieselsteine.',
      tr: 'Akşam ve yatsı namazlarını yatsı vaktinde birleştirerek kılın (Cem-i Tehir). Geceyi burada geçirin ve şeytan taşlama için en az 49 adet küçük taş toplayın.',
      pt: 'Reze Maghrib e Isha combinados e encurtados (Isha para 2 rakahs) no horário de Isha em Muzdalifah. Durma sob o céu e recolha pelo menos 49 pedras pequenas para o apedrejamento.'
    },
    duas: []
  },
  {
    id: 'h_rami',
    number: 5,
    title: {
      en: 'Jamarat Stoning (10th - Eid Day)',
      es: 'Apedrejamiento de Jamarat (Día 10)',
      ar: 'رمي جمرة العقبة الكبرى',
      fr: 'Lapidation des Stèles (Jour 10)',
      de: 'Steinigung der Jamarat (10. Tag)',
      tr: 'Büyük Şeytan Taşlama',
      pt: 'Apedrejamento de Jamarat (Dia 10)'
    },
    description: {
      en: 'Return to Mina and stone the largest pillar (Jamrat al-Aqabah) with 7 pebbles.',
      es: 'Regresa a Mina y apedrea el pilar más grande (Jamrat al-Aqabah) con 7 piedras.',
      ar: 'العودة إلى منى يوم النحر (العاشر) ورمي جمرة العقبة الكبرى بسبع حصيات متعاقبات مع التكبير عند كل رمية.',
      fr: 'Retourner à Mina et lapider la plus grande stèle (Jamrat al-Aqabah) avec 7 cailloux.',
      de: 'Kehren Sie nach Mina zurück und bewerfen Sie die größte Säule (Jamrat al-Aqabah) mit 7 Kieseln.',
      tr: 'Mina\'ya dönün ve Akabe Cemresi\'ne (Büyük Şeytan) sırayla 7 taş atın.',
      pt: 'Retorne a Mina e apedreje o pilar maior (Jamrat al-Aqabah) com 7 pedras.'
    },
    instruction: {
      en: 'Throw 7 pebbles one by one at the pillar, saying "Allahu Akbar" with each throw. Stop reciting the Talbiyah upon throwing the first pebble.',
      es: 'Lanza 7 piedras una a una al pilar, diciendo "Allahu Akbar" con cada lanzamiento. Deja de recitar la Talbiyah al lanzar la primera piedra.',
      ar: 'رمي الحصيات واحدة تلو الأخرى مع التكبير "الله أكبر" مع كل حصاة. قطع التلبية عند بدء الرمي.',
      fr: 'Jeter les 7 cailloux un à un sur la stèle, en disant "Allahu Akbar" à chaque lancer. Cesser de réciter la Talbiyah au premier lancer.',
      de: 'Werfen Sie die 7 Kiesel einzeln auf die Säule und sagen Sie bei jedem Wurf „Allahu Akbar“. Beenden Sie die Talbiyah mit dem ersten Wurf.',
      tr: 'Her taşı atarken "Allahu Ekber" deyin. İlk taşı atarken Telbiye getirmeyi bırakın.',
      pt: 'Lance 7 pedras uma a uma no pilar, dizendo "Allahu Akbar" a cada arremesso. Pare de recitar a Talbiyah ao lançar a primeira pedra.'
    },
    duas: [
      {
        arabic: 'اللَّهُ أَكْبَرُ، رَغْمًا لِلشَّيْطَانِ وَحِزْبِهِ، اللَّهُمَّ اجْعَلْهُ حَجًّا مَبْرُورًا وَذَنْبًا مَغْفُورًا',
        transliteration: 'Allahu Akbar, raghman lish-shaytani wa hizbih. Allahumma-j\'alhu hajjan mabruran wa dhanban maghfoora.',
        translation: {
          en: 'Allah is the Greatest, in defiance of Satan and his faction. O Allah, make it an accepted Hajj and a forgiven sin.',
          es: 'Allah es el más Grande, en desafío a Satán y su facción. Oh Allah, haz que sea un Hajj aceptado y un pecado perdonado.',
          ar: 'يُقال عند رمي كل حصاة تعظيماً لله ودعاء بالقبول.',
          fr: 'Allah est le plus Grand, en dépit de Satan et de ses partisans. Ô Allah, fais de ce pèlerinage un Hajj agréé et un péché pardonné.',
          de: 'Allah ist der Größte, dem Satan und seiner Gefolgschaft zum Trotz. O Allah, mach dies zu einem angenommenen Hajj und einer vergebenen Sünde.',
          tr: 'Allah en büyüktür, şeytana ve ordusuna rağmen. Allah\'ım, bunu kabul olunmuş bir hac ve bağışlanmış günah kıl.',
          pt: 'Allah é o Maior, em desafio a Satã e sua facção. Ó Allah, faça dele um Hajj aceito e um pecado perdoado.'
        }
      }
    ]
  },
  {
    id: 'h_sacrifice_halq',
    number: 6,
    title: {
      en: 'Sacrifice (Hady) & Haircut',
      es: 'Sacrificio (Hady) y Corte',
      ar: 'الهدي والحلق أو التقصير',
      fr: 'Sacrifice (Hady) & Rasage',
      de: 'Opfertier (Hady) & Rasieren',
      tr: 'Kurban Kesimi ve Tıraş',
      pt: 'Sacrifício (Hady) e Corte'
    },
    description: {
      en: 'Offer animal sacrifice (usually managed via voucher) and shave/trim your hair.',
      es: 'Ofrece el sacrificio de un animal (generalmente gestionado por cupón) y afeita o recorta tu cabello.',
      ar: 'ذبح الهدي لمن كان متمتعاً أو قارناً، ثم حلق شعر الرأس كاملاً أو تقصيره للتحلل الأصغر.',
      fr: 'Offrir le sacrifice d’un animal (souvent géré par coupon) et se raser ou couper les cheveux.',
      de: 'Vollziehen Sie das Opfertier (meist über Gutscheine geregelt) und rasieren oder kürzen Sie Ihr Haar.',
      tr: 'Kurban kesin (genellikle banka/acenteler kanalıyla) ve ardından tıraş olup ihramdan çıkın (İlk tehallül).',
      pt: 'Ofereça o sacrifício de um animal (geralmente gerido por cupom) e raspe ou apare o cabelo.'
    },
    instruction: {
      en: 'Once hair is shaved or cut, you enter "Tahal-lul al-Asghar" (partial release). You can change into normal clothes; all restrictions are lifted except marital relations.',
      es: 'Una vez afeitado o cortado el pelo, entras en "Tahal-lul al-Asghar" (liberación parcial). Puedes usar ropa normal; se levantan todas las restricciones excepto las relaciones conyugales.',
      ar: 'بعد الحلق أو التقصير يحدث التحلل الأول (الأصغر)، فيباح للمحرم كل شيء حرم عليه بسبب الإحرام إلا النساء.',
      fr: 'Une fois rasé ou tondu, vous entrez en "Tahal-lul al-Asghar" (première désacralisation). Vous pouvez vous rhabiller ; toutes les interdictions sont levées sauf les relations conjugales.',
      de: 'Nach dem Rasieren oder Kürzen der Haare erreichen Sie „Tahal-lul al-Asghar“ (teilweise Entweiung). Sie können normale Kleidung anlegen; alle Verbote außer ehelichen Beziehungen sind aufgehoben.',
      tr: 'Tıraş olduktan sonra ilk tehallül gerçekleşir. Eşiyle yakınlaşma dışındaki tüm ihram yasakları kalkar.',
      pt: 'Uma vez raspado ou cortado o cabelo, você entra em "Tahal-lul al-Asghar" (liberação parcial). Pode vestir roupas normais; todas as restrições são levantadas exceto as relações conjugais.'
    },
    duas: []
  },
  {
    id: 'h_tawaf_ifadah',
    number: 7,
    title: {
      en: 'Tawaf al-Ifadah & Sa\'i',
      es: 'Tawaf al-Ifadah y Sa\'i',
      ar: 'طواف الإفاضة والسعي',
      fr: 'Tawaf al-Ifadah & Sa’i',
      de: 'Tawaf al-Ifadah & Sa\'i',
      tr: 'Ziyaret Tavafı ve Sa\'y',
      pt: 'Tawaf al-Ifadah e Sa\'i'
    },
    description: {
      en: 'Go to Masjid al-Haram to perform the main Tawaf of Hajj and the Sa\'i.',
      es: 'Ve a la Mezquita Al-Haram para realizar el Tawaf principal del Hajj y el Sa\'i.',
      ar: 'الذهاب إلى مكة لأداء طواف الإفاضة وسعي الحج بين الصفا والمروة، وبه يتم التحلل الأكبر.',
      fr: 'Se rendre au Masjid al-Haram pour accomplir le Tawaf majeur du Hajj et le Sa’i.',
      de: 'Begeben Sie sich zur Al-Haram-Moschee, um den Haupt-Tawaf des Hajj und das Sa\'i zu vollziehen.',
      tr: 'Mescid-i Haram\'a giderek Haccın farzı olan Ziyaret Tavafını ve Hac Sa\'yını yapın.',
      pt: 'Vá à Mesquita Al-Haram para realizar o Tawaf principal do Hajj e o Sa\'i.'
    },
    instruction: {
      en: 'After completing this Tawaf, you enter "Tahal-lul al-Akbar" (complete release). All restrictions, including marital relations, are now lifted.',
      es: 'Después de completar este Tawaf, entras en "Tahal-lul al-Akbar" (liberación completa). Se levantan todas las restricciones, incluidas las relaciones conyugales.',
      ar: 'بعد الانتهاء من طواف الإفاضة وسعي الحج يتحلل المحرم تحللاً كاملاً (التحلل الأكبر) ويحل له كل شيء.',
      fr: 'Après ce Tawaf, vous êtes en "Tahal-lul al-Akbar" (désacralisation totale). Toutes les restrictions, y compris les rapports conjugaux, sont levées.',
      de: 'Nach diesem Tawaf erreichen Sie „Tahal-lul al-Akbar“ (vollständige Entweiung). Alle Einschränkungen, inklusive der ehelichen Beziehungen, fallen weg.',
      tr: 'Bu tavafı ve sa\'yı tamamladıktan sonra ikinci tehallül gerçekleşir. Artık eşler arasındaki yakınlaşma dahil tüm yasaklar kalkar.',
      pt: 'Depois de concluir este Tawaf, você entra em "Tahal-lul al-Akbar" (liberação completa). Todas as restrições, incluindo relações conjugais, são levantadas.'
    },
    duas: []
  },
  {
    id: 'h_tashreeq',
    number: 8,
    title: {
      en: 'Stay in Mina & Stoning (11th-13th)',
      es: 'Estancia en Mina y Piedras (11-13)',
      ar: 'أيام التشريق بمنى والرمي',
      fr: 'Séjour à Mina & Lapidation (11-13)',
      de: 'Aufenthalt in Mina & Steinigung (11.-13.)',
      tr: 'Teşrik Günleri ve Şeytan Taşlama',
      pt: 'Estadia em Mina e Pedras (11-13)'
    },
    description: {
      en: 'Return to Mina and stay for the 2 or 3 days of Tashreeq. Stone all three pillars daily.',
      es: 'Regresa a Mina y quédate durante los 2 o 3 días de Tashreeq. Apedrea los tres pilares diariamente.',
      ar: 'المبيت بمنى أيام التشريق (11، 12، و13) ورمي الجمرات الثلاث (الصغرى والوسطى والعقبة) كل يوم بعد الزوال.',
      fr: 'Retourner à Mina pour les 2 ou 3 jours de Tashreeq. Lapider les trois stèles chaque après-midi.',
      de: 'Kehren Sie nach Mina zurück und verweilen Sie dort die 2 oder 3 Tage von Tashreeq. Steinigen Sie täglich alle drei Säulen.',
      tr: 'Mina\'ya dönün ve Teşrik günlerinde her gün öğle vaktinden sonra Küçük, Orta ve Büyük şeytana sırayla 7\'şer taş atın.',
      pt: 'Retorne a Mina e permaneça pelos 2 ou 3 dias de Tashreeq. Apedreje os três pilares diariamente.'
    },
    instruction: {
      en: 'Stone the Small, Medium, and Large Jamarat in order with 7 pebbles each, after Dhuhr. You may leave on the 12th after stoning if departing before sunset (haste).',
      es: 'Apedrea la Jamarat Pequeña, Mediana y Grande en orden con 7 piedras cada una, después de Dhuhr. Puedes irte el día 12 después del apedrejamento si te retiras antes del atardecer (prisa).',
      ar: 'رمي الجمرة الصغرى ثم الوسطى ثم الكبرى بسبع حصيات لكل منها بعد زوال الشمس. يجوز التعجل والمغادرة في اليوم الثاني عشر قبل الغروب.',
      fr: 'Lapider la Petite, la Moyenne puis la Grande stèle dans l’ordre avec 7 cailloux chacune, après le zénith. Départ possible le 12 avant le coucher du soleil.',
      de: 'Bewerfen Sie die kleine, mittlere und große Jamarah nacheinander nach dem Dhuhr-Gebet mit je 7 Kieseln. Abreise am 12. vor Sonnenuntergang ist erlaubt (Eile).',
      tr: 'Her gün üç cemreye (Küçük, Orta, Büyük) sırayla 7\'şer taş atın. Dileyen hacılar 12. gün akşamından önce Mina\'dan ayrılabilir (Ta\'cil).',
      pt: 'Apedreje a Jamarat Pequena, Média e Grande em ordem com 7 pedras cada, após Dhuhr. Pode partir no dia 12 após o apedrejamento se sair antes do pôr do sol.'
    },
    duas: []
  },
  {
    id: 'h_wada',
    number: 9,
    title: {
      en: 'Tawaf al-Wada (Farewell Tawaf)',
      es: 'Tawaf al-Wada (Tawaf de Despedida)',
      ar: 'طواف الوداع',
      fr: 'Tawaf al-Wada (Tawaf d’Adieu)',
      de: 'Tawaf al-Wada (Abschieds-Tawaf)',
      tr: 'Veda Tavafı',
      pt: 'Tawaf al-Wada (Tawaf de Despedida)'
    },
    description: {
      en: 'Perform the farewell circumambulation around the Kaaba before leaving Mecca.',
      es: 'Realiza la circunvalación de despedida alrededor de la Kaaba antes de salir de La Meca.',
      ar: 'طواف سبعة أشواط حول الكعبة قبل مغادرة مكة مباشرة، وهو آخر العهد بالبيت الحرام.',
      fr: 'Accomplir le Tawaf d’adieu autour de la Kaaba juste avant de quitter la Mecque.',
      de: 'Vollziehen Sie die Abschiedsumrundung der Kaaba direkt vor der Abreise aus Mekka.',
      tr: 'Mekke\'den ayrılmadan önce Kabe\'ye veda etmek amacıyla son bir kez tavaf (Veda Tavafı) yapın.',
      pt: 'Realize a circunvalação de despedida ao redor da Kaaba antes de sair de Meca.'
    },
    instruction: {
      en: 'This must be the very last action you perform in Mecca before departure. Women during menstruation are exempt from this ritual.',
      es: 'Esta debe ser la última acción que realices en La Meca antes de partir. Las mujeres con menstruación están exentas de este ritual.',
      ar: 'يجب أن يكون طواف الوداع آخر ما يفعله الحاج بمكة قبل السفر. وتُعافى النساء الحائض أو النفساء منه.',
      fr: 'Ce doit être la dernière action effectuée à la Mecque avant le départ. Les femmes indisposées en sont dispensées.',
      de: 'Dies muss Ihre letzte Handlung in Mekka vor der Heimreise sein. Frauen in der Menstruation sind davon ausgenommen.',
      tr: 'Bu tavaf, Mekke\'den ayrılmadan önceki en son ibadettir. Özel durumundaki kadınlar bu tavaftan muaftır.',
      pt: 'Esta deve ser a última ação realizada em Meca antes da partida. As mulheres durante o período menstrual estão isentas deste ritual.'
    },
    duas: []
  }
];

interface HajjUmrahScreenProps {
  onClose: () => void;
}

export function HajjUmrahScreen({ onClose }: HajjUmrahScreenProps) {
  const { settings } = useSettings();
  const lang = settings.language || 'es';
  const t = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.es;

  const [activeTab, setActiveTab] = useState<'umrah' | 'hajj'>('umrah');
  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('app_pilgrimage_completed');
    return saved ? JSON.parse(saved) : {};
  });

  const [playingDuaText, setPlayingDuaText] = useState<string | null>(null);

  const steps = activeTab === 'umrah' ? UMRAH_STEPS : HAJJ_STEPS;

  // Sync completion state to local storage
  const toggleStepCompleted = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = { ...completedSteps, [id]: !completedSteps[id] };
    setCompletedSteps(updated);
    localStorage.setItem('app_pilgrimage_completed', JSON.stringify(updated));
  };

  // Reset selected step when tab changes
  useEffect(() => {
    setSelectedStepId(activeTab === 'umrah' ? 'u_ihram' : 'h_ihram');
  }, [activeTab]);

  // Audio recitation via HTML5 Web Speech Synthesis API
  const handlePlayDua = (duaText: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingDuaText === duaText) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setPlayingDuaText(null);
      return;
    }

    if (!window.speechSynthesis) {
      alert("TTS not supported on this browser.");
      return;
    }

    window.speechSynthesis.cancel(); // Stop any active speech

    setPlayingDuaText(duaText);
    const utterance = new SpeechSynthesisUtterance(duaText);
    utterance.lang = 'ar-SA';
    
    // Attempt to pick a premium Arabic voice
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) {
      utterance.voice = arabicVoice;
    }

    utterance.onend = () => {
      setPlayingDuaText(null);
    };
    utterance.onerror = () => {
      setPlayingDuaText(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const selectedStep = steps.find(s => s.id === selectedStepId) || steps[0];

  return (
    <div className="fixed inset-0 z-40 bg-[#022C22] text-[#F3F4F6] overflow-y-auto px-5 pt-12 pb-12 flex flex-col justify-start">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#022C22] to-[#011410] -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] -z-10" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onClose}
          className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#FCD34D] tracking-tight">
            {t.title}
          </h1>
          <p className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-semibold opacity-75 mt-0.5">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-black/20 p-1 rounded-2xl border border-white/5 mb-6 max-w-md w-full mx-auto">
        <button
          onClick={() => setActiveTab('umrah')}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'umrah'
              ? 'bg-[#059669] text-white shadow-md'
              : 'text-[#A7F3D0]/60 hover:text-white'
          }`}
        >
          <Compass size={14} />
          {t.tabUmrah}
        </button>
        <button
          onClick={() => setActiveTab('hajj')}
          className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'hajj'
              ? 'bg-[#059669] text-white shadow-md'
              : 'text-[#A7F3D0]/60 hover:text-white'
          }`}
        >
          <Award size={14} />
          {t.tabHajj}
        </button>
      </div>

      {/* Overview Intro Banner */}
      <div className="bg-white/[0.03] border border-white/10 p-4 rounded-3xl mb-6 text-left flex gap-3.5 items-start max-w-xl mx-auto shadow-sm">
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-[#FCD34D] rounded-2xl shrink-0 mt-0.5">
          <BookOpen size={16} />
        </div>
        <div>
          <h4 className="text-xs font-bold text-[#FCD34D] uppercase tracking-wider mb-1">{t.introTitle}</h4>
          <p className="text-[11px] text-[#A7F3D0]/80 leading-relaxed font-light">
            {t.introDesc}
          </p>
        </div>
      </div>

      {/* Interactive Bento Step Guide Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-6xl w-full mx-auto pb-12 items-start">
        {/* Left Side: Step progress list (Bento cards list) - col 5 */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {steps.map((step) => {
            const isSelected = selectedStepId === step.id;
            const isCompleted = completedSteps[step.id];

            return (
              <motion.div
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={`p-4 rounded-3xl border text-left cursor-pointer transition-all flex items-center gap-4 relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#059669] border-[#10B981] shadow-lg shadow-[#059669]/15'
                    : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                }`}
              >
                <div
                  onClick={(e) => toggleStepCompleted(step.id, e)}
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center border transition-all ${
                    isCompleted
                      ? 'bg-[#FCD34D] text-[#022C22] border-[#FCD34D]'
                      : isSelected
                      ? 'bg-white/15 text-[#A7F3D0] border-white/20'
                      : 'bg-black/25 text-[#A7F3D0]/60 border-white/5 hover:border-white/10'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold font-mono">#{step.number}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <span className={`text-[8px] font-extrabold uppercase tracking-widest block mb-0.5 ${
                    isSelected ? 'text-white/70' : 'text-[#A7F3D0]/50'
                  }`}>
                    {t.step} {step.number}
                  </span>
                  <h3 className={`font-bold text-xs truncate leading-snug ${
                    isSelected ? 'text-white' : 'text-white/90'
                  }`}>
                    {step.title[lang] || step.title.en}
                  </h3>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right Side: Step Details & Supplications Card - col 7 */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 text-left space-y-5 shadow-lg relative overflow-hidden"
            >
              {/* Top Banner with Quick Actions */}
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div>
                  <span className="text-[9px] font-black text-[#FCD34D] uppercase tracking-widest">
                    {t.step} {selectedStep.number} / {steps.length}
                  </span>
                  <h2 className="text-lg font-bold text-white leading-tight mt-0.5">
                    {selectedStep.title[lang] || selectedStep.title.en}
                  </h2>
                </div>

                <button
                  onClick={(e) => toggleStepCompleted(selectedStep.id, e)}
                  className={`px-3 py-1.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    completedSteps[selectedStep.id]
                      ? 'bg-[#FCD34D] text-[#022C22] border-[#FCD34D]'
                      : 'bg-white/5 text-[#A7F3D0] border-white/10 hover:bg-white/10'
                  }`}
                >
                  <CheckCircle2 size={12} />
                  {completedSteps[selectedStep.id] ? t.completedSuccess : t.completed}
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-[9px] font-bold text-[#A7F3D0] uppercase tracking-widest">
                  {lang === 'es' ? 'Descripción del Ritual' : 'Ritual Description'}
                </h4>
                <p className="text-xs text-[#A7F3D0] leading-relaxed font-light">
                  {selectedStep.description[lang] || selectedStep.description.en}
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-emerald-950/20 p-4.5 border border-emerald-900/30 rounded-3xl space-y-1.5">
                <h4 className="text-[9px] font-bold text-[#FCD34D] uppercase tracking-widest flex items-center gap-1">
                  <Compass size={11} className="text-[#FCD34D]" />
                  {lang === 'es' ? 'Instrucciones Prácticas' : 'Practical Instructions'}
                </h4>
                <p className="text-xs text-white/90 leading-relaxed font-light">
                  {selectedStep.instruction[lang] || selectedStep.instruction.en}
                </p>
              </div>

              {/* Duas / Recitation Section */}
              {selectedStep.duas && selectedStep.duas.length > 0 && (
                <div className="space-y-3.5 pt-2">
                  <h4 className="text-[9px] font-bold text-[#A7F3D0]/60 uppercase tracking-widest">
                    {t.duasHeader}
                  </h4>

                  <div className="space-y-3">
                    {selectedStep.duas.map((dua, index) => {
                      const isPlaying = playingDuaText === dua.arabic;

                      return (
                        <div key={index} className="bg-black/25 p-4.5 rounded-3xl border border-white/5 space-y-3 shadow-inner">
                          {/* Audio TTS Controls */}
                          <div className="flex justify-between items-center gap-3">
                            <span className="text-[8px] font-bold text-[#A7F3D0]/50 uppercase tracking-widest">
                              {lang === 'es' ? `Súplica #${index + 1}` : `Dua #${index + 1}`}
                            </span>

                            <button
                              onClick={(e) => handlePlayDua(dua.arabic, e)}
                              className={`px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                                isPlaying
                                  ? 'bg-[#FCD34D] text-[#022C22] border-[#FCD34D]'
                                  : 'bg-[#059669]/20 text-[#A7F3D0] border-[#059669]/30 hover:bg-[#059669]/30'
                              }`}
                            >
                              {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                              {isPlaying ? t.stopDua : t.playDua}
                            </button>
                          </div>

                          {/* Arabic Text */}
                          <p className="text-lg font-arabic text-white leading-loose text-right drop-shadow-sm select-all" dir="rtl">
                            {dua.arabic}
                          </p>

                          {/* Transliteration */}
                          <p className="text-[10px] text-[#A7F3D0]/80 italic leading-relaxed pt-1 select-all">
                            {dua.transliteration}
                          </p>

                          {/* Translation */}
                          <p className="text-xs text-white opacity-90 leading-relaxed border-t border-white/5 pt-2 select-all">
                            {dua.translation[lang] || dua.translation.en}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      {/* TTS Processing Overlay */}
      {playingDuaText && (
        <div className="fixed bottom-6 left-6 z-50 bg-black/85 backdrop-blur border border-white/10 px-4 py-2.5 rounded-2xl flex items-center gap-2.5 shadow-xl animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-[#FCD34D] animate-ping" />
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            {t.ttsActive}
          </span>
        </div>
      )}
    </div>
  );
}
