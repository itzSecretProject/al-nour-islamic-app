import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Navigation, Compass, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from '../hooks/useLocation';
import { useSettings } from '../hooks/useSettings';
import { translations } from '../utils/translations';
import { getQiblaDirection } from '../utils/qibla';
import geomagnetism from 'geomagnetism';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const PERMISSION_KEY = 'compassPermissionGranted';

// Compute the Qibla line as a 2-point segment from the user to just beyond the
// current viewport edge, in the exact bearing direction.
//
// Key insight: on Web Mercator (Leaflet's projection) a constant-bearing rhumb
// line is a perfectly STRAIGHT line, and because the projection is conformal and
// meridians are vertical, that straight line sits at exactly `bearing°` clockwise
// from screen-up. So we can place the far endpoint in pixel space at the bearing
// angle and unproject it — no great-circle curve, and because the endpoint is
// only just off-screen it is never clipped by Leaflet's SVG buffer at any zoom.
function qiblaLinePoints(map: L.Map, userPos: [number, number], bearingDeg: number): [number, number][] {
  const θ = bearingDeg * Math.PI / 180;
  const userPt = map.latLngToContainerPoint(userPos);
  const size = map.getSize();
  // Far enough to always exit the viewport (full diagonal + margin).
  const far = size.x + size.y + 256;
  const endPt = userPt.add(L.point(Math.sin(θ), -Math.cos(θ)).multiplyBy(far));
  const endLatLng = map.containerPointToLatLng(endPt);
  return [userPos, [endLatLng.lat, endLatLng.lng]];
}

interface QiblaScreenProps {
  onBack?: () => void;
}

// Circular low-pass filter: smooths a heading toward a new reading along the
// shortest arc so it never spins through 180° when crossing the 0°/360° seam.
function smoothHeading(prev: number, next: number, factor = 0.25): number {
  const delta = ((next - prev + 540) % 360) - 180; // shortest signed diff [-180, 180]
  return (prev + delta * factor + 360) % 360;
}

export function QiblaScreen({ onBack }: QiblaScreenProps) {
  const browserLocation = useLocation();
  const { settings } = useSettings();
  
  const [heading, setHeading] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isSensorActive, setIsSensorActive] = useState(false);
  const [sensorTimedOut, setSensorTimedOut] = useState(false);
  const headingRef = useRef(0);
  // true = heading is magnetic (needs declination correction); false = already true/geographic north
  const headingIsMagneticRef = useRef(true);

  // Map settings
  const [mapMode, setMapMode] = useState<'road' | 'satellite'>('satellite');
  const [mapLoaded, setMapLoaded] = useState(false);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Localization
  const lang = settings.language || 'es';
  const t = translations[lang] || translations.es;

  // Coordinate resolution
  const latitude = settings.locationMode === 'auto' ? browserLocation.latitude : settings.manualLatitude;
  const longitude = settings.locationMode === 'auto' ? browserLocation.longitude : settings.manualLongitude;
  const loading = settings.locationMode === 'auto' ? browserLocation.loading : false;

  const qiblaAngle = latitude != null && longitude != null ? getQiblaDirection(latitude, longitude) : 135;

  // Magnetic declination (WMM) at the user's location. Phone compasses report
  // MAGNETIC heading; the Qibla bearing is geographic (true north). Convert the
  // device heading to true north so the alignment is accurate worldwide.
  const declination = useMemo(() => {
    if (latitude == null || longitude == null) return 0;
    try { return geomagnetism.model().point([latitude, longitude]).decl || 0; } catch { return 0; }
  }, [latitude, longitude]);

  // Only apply WMM declination when the sensor gives magnetic north (Android fallback).
  // iOS webkitCompassHeading and deviceorientationabsolute already provide geographic north.
  const trueHeading = headingIsMagneticRef.current
    ? ((heading + declination) % 360 + 360) % 360
    : heading;
  const diff = ((qiblaAngle - trueHeading) % 360 + 360) % 360;
  const isFacingQibla = diff < 6 || diff > 354;

  // Track whether we've received an absolute event so we can ignore relative ones
  const hasAbsoluteRef = useRef(false);

  // Listen to orientation sensors
  const listenToOrientation = () => {
    const handleAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha == null) return;
      hasAbsoluteRef.current = true;
      // deviceorientationabsolute alpha is already relative to geographic (true) north
      headingIsMagneticRef.current = false;
      const h = (360 - e.alpha + 360) % 360;
      setIsSensorActive(true);
      setSensorTimedOut(false);
      headingRef.current = smoothHeading(headingRef.current, h);
      setHeading(Math.round(headingRef.current));
    };

    const handleRelative = (e: DeviceOrientationEvent) => {
      // Skip if we already have absolute readings (more accurate)
      if (hasAbsoluteRef.current) return;

      let h: number | null = null;
      if ((e as any).webkitCompassHeading != null) {
        // iOS: webkitCompassHeading is already relative to true north — no declination needed
        headingIsMagneticRef.current = false;
        h = (e as any).webkitCompassHeading;
      } else if (e.alpha != null) {
        // Android fallback: alpha is magnetic — declination correction required
        headingIsMagneticRef.current = true;
        h = (360 - e.alpha + 360) % 360;
      }
      if (h === null) return;
      setIsSensorActive(true);
      setSensorTimedOut(false);
      headingRef.current = smoothHeading(headingRef.current, h);
      setHeading(Math.round(headingRef.current));
    };

    window.addEventListener('deviceorientationabsolute', handleAbsolute as any, true);
    window.addEventListener('deviceorientation', handleRelative as any, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsolute as any, true);
      window.removeEventListener('deviceorientation', handleRelative as any, true);
    };
  };

  useEffect(() => {
    if (!window.DeviceOrientationEvent) {
      setIsSupported(false);
      setPermissionGranted(false);
      return;
    }

    const saved = localStorage.getItem(PERMISSION_KEY);
    if (saved === 'granted') {
      setPermissionGranted(true);
      return;
    }

    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      // iOS requires permission from a user gesture — auto-call will fail.
      // Show the permission UI so the user can tap the button.
      (DeviceOrientationEvent as any).requestPermission()
        .then((state: string) => {
          if (state === 'granted') {
            localStorage.setItem(PERMISSION_KEY, 'granted');
            setPermissionGranted(true);
          } else {
            setPermissionGranted(false);
          }
        })
        .catch(() => {
          // Failed (expected on iOS when not triggered by user gesture).
          // Show the permission overlay so the user can tap to enable.
          setPermissionGranted(false);
        });
    } else {
      setPermissionGranted(true);
      localStorage.setItem(PERMISSION_KEY, 'granted');
    }
  }, []);

  useEffect(() => {
    if (permissionGranted && isSupported) {
      const cleanup = listenToOrientation();
      // If sensors don't respond within 3s, prompt the user to reactivate
      const timeout = setTimeout(() => {
        if (!isSensorActive) setSensorTimedOut(true);
      }, 3000);
      return () => {
        cleanup?.();
        clearTimeout(timeout);
      };
    }
  }, [permissionGranted, isSupported]);

  const requestPermission = async () => {
    try {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const state = await (DeviceOrientationEvent as any).requestPermission();
        if (state === 'granted') {
          localStorage.setItem(PERMISSION_KEY, 'granted');
          setPermissionGranted(true);
          listenToOrientation();
        } else {
          setPermissionGranted(false);
        }
      } else {
        localStorage.setItem(PERMISSION_KEY, 'granted');
        setPermissionGranted(true);
        listenToOrientation();
      }
    } catch {
      setPermissionGranted(false);
    }
  };

  // Re-center on user position
  const handleLocate = () => {
    if (mapInstanceRef.current && latitude != null && longitude != null) {
      mapInstanceRef.current.setView([latitude, longitude], 17);
    }
  };

  // Show full route from user location to Mecca
  const handleFitBounds = () => {
    if (mapInstanceRef.current && latitude != null && longitude != null) {
      const bounds = L.latLngBounds([
        [latitude, longitude],
        [21.422487, 39.826206]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || loading || latitude == null || longitude == null) return;

    const userPos: [number, number] = [latitude, longitude];
    const meccaPos: [number, number] = [21.422487, 39.826206];

    // Initialize Map Instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(userPos, 15);

    mapInstanceRef.current = map;

    // Layer Tiles
    const tileUrl = mapMode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tiles = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);
    tileLayerRef.current = tiles;

    // Custom Kaaba Marker
    const kaabaIcon = L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="
          width: 32px; 
          height: 32px; 
          background-color: #000000; 
          border: 2px solid #FCD34D;
          border-radius: 6px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <!-- Gold band representing Kiswah belt -->
          <div style="width: 100%; height: 5px; background-color: #FCD34D; position: absolute; top: 8px;"></div>
          <span style="font-size: 14px; position: relative; z-index: 2; transform: translateY(3px);">🕋</span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker(meccaPos, { icon: kaabaIcon }).addTo(map);

    // Custom User Marker HTML with Heading arrow placeholder
    const userIcon = L.divIcon({
      className: 'bg-transparent border-none',
      html: `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
          <!-- Green direction arrow -->
          <div id="user-heading-arrow" style="
            position: absolute;
            top: 0px;
            left: 12px;
            width: 24px;
            height: 48px;
            transition: transform 0.1s ease-out;
            transform-origin: 12px 24px;
            pointer-events: none;
            transform: rotate(${heading}deg);
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <!-- Glow shadow filter integrated in SVG -->
              <path d="M12 2L4 15H9V22H15V15H20L12 2Z" fill="#10B981" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
          <!-- Blue user location dot -->
          <div style="
            width: 18px; 
            height: 18px; 
            background-color: #007AFF; 
            border: 3px solid #ffffff; 
            border-radius: 50%; 
            box-shadow: 0 0 8px rgba(0, 122, 255, 0.8);
            position: absolute;
            top: 15px;
            left: 15px;
            z-index: 10;
          "></div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    const userMarker = L.marker(userPos, { icon: userIcon }).addTo(map);
    userMarkerRef.current = userMarker;

    // Qibla ray — drawn to the viewport edge and redrawn on every pan/zoom so it
    // always reaches the screen edge in the exact bearing, never clipped.
    const qibla = getQiblaDirection(latitude!, longitude!);
    const polyline = L.polyline(qiblaLinePoints(map, userPos, qibla), {
      color: '#3B82F6',
      weight: 4,
      opacity: 1,
    }).addTo(map);
    polylineRef.current = polyline;

    const redrawQiblaLine = () => {
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(qiblaLinePoints(map, userPos, qibla));
      }
    };
    map.on('move zoom zoomend moveend resize', redrawQiblaLine);

    // The map often mounts while the screen is still animating in (container has
    // zero size) → Leaflet renders blank tiles. Force a re-measure a few times
    // and whenever the container resizes so tiles always paint.
    const fixSize = () => { map.invalidateSize(); redrawQiblaLine(); };
    const t1 = setTimeout(fixSize, 250);
    const t2 = setTimeout(fixSize, 650);
    const ro = new ResizeObserver(() => { map.invalidateSize(); redrawQiblaLine(); });
    ro.observe(mapContainerRef.current);

    setMapLoaded(true);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro.disconnect();
      map.off('move zoom zoomend moveend resize', redrawQiblaLine);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, loading]);

  // Handle map mode switches
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    const tileUrl = mapMode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const newTiles = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTiles;
  }, [mapMode]);

  // Update user pointer rotation in real-time without recreating Leaflet instances
  useEffect(() => {
    const arrowEl = document.getElementById('user-heading-arrow');
    if (arrowEl) {
      arrowEl.style.transform = `rotate(${trueHeading}deg)`;
    }
  }, [trueHeading]);

  return (
    <div className="fixed inset-0 z-35 bg-[#022C22] text-[#F3F4F6] overflow-hidden flex flex-col justify-start">
      {/* Header Overlay */}
      <div className="absolute top-14 left-5 z-[1000] flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-3 bg-white text-slate-800 rounded-full shadow-lg hover:bg-slate-50 transition-all border border-black/10 flex items-center justify-center cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-black text-slate-900 drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] uppercase tracking-wide">
          {t.qiblaTitle}
        </span>
      </div>

      {/* Rotating Compass Dial in Top Right */}
      {permissionGranted && isSupported && isSensorActive && (
        <div className="absolute top-14 right-5 z-[1000] w-14 h-14 bg-white/95 backdrop-blur rounded-full border border-black/10 shadow-lg flex items-center justify-center pointer-events-none">
          {/* Card Dial */}
          <motion.div
            animate={{ rotate: -trueHeading }}
            transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
            className="w-12 h-12 relative flex items-center justify-center"
          >
            <span className="absolute top-0.5 text-[10px] font-black text-red-500">N</span>
            <span className="absolute right-1 text-[9px] font-black text-slate-700">E</span>
            <span className="absolute bottom-0.5 text-[9px] font-black text-slate-700">S</span>
            <span className="absolute left-1 text-[9px] font-black text-slate-700">W</span>
            <div className="w-10 h-10 border border-slate-200 rounded-full flex items-center justify-center">
              <div className="w-0.5 h-10 bg-slate-300 absolute" />
              <div className="w-10 h-0.5 bg-slate-300 absolute" />
            </div>
          </motion.div>
          {/* Top Red Pointer */}
          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-red-600" />
        </div>
      )}

      {/* Alignment Glowing Popup */}
      <AnimatePresence>
        {isFacingQibla && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600 border border-emerald-400 text-white font-extrabold text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-1.5 shadow-emerald-500/25"
          >
            <span className="animate-ping w-2 h-2 rounded-full bg-white shrink-0" />
            {t.qiblaAligned}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-[#022c22]" />

      {/* Bottom Road/Satellite Segmented Toggle */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] flex bg-black/75 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-2xl">
        <button
          onClick={() => setMapMode('road')}
          className={`px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
            mapMode === 'road'
              ? 'bg-white text-black shadow'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {t.mapRoad}
        </button>
        <button
          onClick={() => setMapMode('satellite')}
          className={`px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
            mapMode === 'satellite'
              ? 'bg-white text-black shadow'
              : 'text-white/60 hover:text-white'
          }`}
        >
          {t.mapSatellite}
        </button>
      </div>

      {/* Bottom Right Locate Button */}
      {latitude != null && longitude != null && (
        <button
          onClick={handleLocate}
          className="absolute bottom-10 right-5 z-[1000] p-3 bg-white text-blue-600 rounded-full shadow-2xl hover:bg-slate-50 border border-black/10 transition-all cursor-pointer"
          title={t.myLocation}
        >
          <Navigation size={20} className="fill-blue-600" />
        </button>
      )}

      {/* Bottom Left Fit Bounds Route Button */}
      {latitude != null && longitude != null && (
        <button
          onClick={handleFitBounds}
          className="absolute bottom-10 left-5 z-[1000] p-3 bg-white text-emerald-700 rounded-full shadow-2xl hover:bg-slate-50 border border-black/10 transition-all cursor-pointer"
          title={t.viewRouteMecca}
        >
          <Compass size={20} className="fill-emerald-700" />
        </button>
      )}

      {/* Loading Overlay */}
      {(loading || !mapLoaded) && (
        <div className="absolute inset-0 z-50 bg-[#022C22] flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-[#FCD34D]" size={36} />
          <p className="text-xs uppercase tracking-widest font-black text-[#A7F3D0]/80">{t.locating}</p>
        </div>
      )}

      {/* Permission Overlay — shown when permission is denied or pending (null/false) */}
      {(permissionGranted === false || permissionGranted === null) && (
        <div className="absolute inset-0 z-50 bg-[#022C22] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white/[0.03] backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 text-center w-full max-w-sm shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-[#FCD34D]/10 border border-[#FCD34D]/20 flex items-center justify-center mx-auto shadow-inner">
              <Compass size={32} className="text-[#FCD34D]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white text-lg">{t.allowCompassTitle}</h3>
              <p className="text-xs text-[#A7F3D0] opacity-80 leading-relaxed">
                {t.allowCompassDesc}
              </p>
            </div>
            <button
              onClick={requestPermission}
              className="bg-[#FCD34D] text-[#022C22] w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#FCD34D]/10 active:scale-95 transition-all cursor-pointer"
            >
              {t.enableCompassBtn}
            </button>
          </div>
        </div>
      )}

      {/* Sensor timeout toast — permission granted but events not firing (iOS session expired) */}
      {permissionGranted === true && sensorTimedOut && !isSensorActive && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
          <div className="bg-black/80 backdrop-blur-lg border border-[#FCD34D]/30 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-2xl">
            <Compass size={18} className="text-[#FCD34D] shrink-0" />
            <p className="text-xs text-white/80 leading-snug flex-1">
              {t.compassNotSupported}
            </p>
            <button
              onClick={requestPermission}
              className="text-[#FCD34D] font-black text-[10px] uppercase tracking-wider shrink-0"
            >
              {t.enableCompassBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
