import React from 'react';
import { useSettings } from '../hooks/useSettings';

export function LoadingScreen({ message }: { message?: string }) {
  const { settings } = useSettings();
  
  const isCrescentLogo = settings.appLogo === 'golden-crescent';
  const logoSrc = isCrescentLogo ? '/al_nour_logo.png' : '/icon-512.png';
  const lang = settings.language || 'es';

  const defaultMessage = lang === 'es' 
    ? 'Preparando Tiempos de Rezo...' 
    : lang === 'ar'
    ? 'جاري إعداد مواقيت الصلاة...'
    : lang === 'fr'
    ? 'Préparation des horaires de prière...'
    : lang === 'de'
    ? 'Gebetszeiten werden vorbereitet...'
    : lang === 'tr'
    ? 'Namaz vakitleri hazırlanıyor...'
    : lang === 'pt'
    ? 'Preparando horários de oração...'
    : 'Preparing Prayer Times...';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#022C22]/90 backdrop-blur-xl animate-fade-in">
      {/* Background radial glow */}
      <div className="absolute w-[280px] h-[280px] bg-emerald-500/10 rounded-full blur-[90px] -z-10" />

      {/* Pulse Logo container */}
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        {/* Soft glowing ring */}
        <div className="absolute inset-0 rounded-full border border-[#FCD34D]/20 animate-ping opacity-60" style={{ animationDuration: '3s' }} />
        
        <img 
          src={logoSrc} 
          alt="Al Nour Logo" 
          className="w-16 h-16 object-contain drop-shadow-[0_4px_12px_rgba(252,211,77,0.3)] animate-pulse"
        />
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-[#FCD34D] tracking-wide mb-3 drop-shadow-md font-sans">
        Al Nour
      </h2>

      {/* Spinning Ring */}
      <div className="w-7 h-7 rounded-full border-[2.5px] border-white/5 border-t-[#FCD34D] animate-spin mb-4" />

      {/* Subtitle / Custom Message */}
      <p className="text-[10px] text-[#A7F3D0] uppercase tracking-widest font-semibold animate-pulse px-6 text-center leading-normal">
        {message || defaultMessage}
      </p>
    </div>
  );
}
