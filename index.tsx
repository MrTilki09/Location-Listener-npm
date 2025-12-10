import Geolocation from "@react-native-community/geolocation";
import { createContext, useContext, useEffect, useState, useRef } from "react";

export type LocationType = { lat: number; long: number };

interface LocationContextType {
  location: LocationType | null;
  startListening: () => void;
}

const LocationListener = createContext<LocationContextType>({
  location: null,
  startListening: () => {}
});

interface LocationProviderProps {
  children: React.ReactNode;
  onLocation?: (loc: LocationType) => void;
  highAccuracy?: boolean ;
  distanceFilter?: number;
  interval?: number;
  fastestInterval?: number;
  timeout?: number;
  maximumAge?: number;
}

export default function LocationProvider({ children, onLocation, highAccuracy = false, distanceFilter = 5, interval = 10000, fastestInterval = 5000, timeout = 20000, maximumAge = 5000 }: LocationProviderProps) {
  const [location, setLocation] = useState<LocationType | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const isActiveRef = useRef(false);

  const clearWatch = () => {
    if (watchIdRef.current != null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const clearRetry = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const startWatcherOnce = () => {
    if (watchIdRef.current != null) return;
    watchIdRef.current = Geolocation.watchPosition(
      position => {
        const newLoc = { lat: position.coords.latitude, long: position.coords.longitude };
        setLocation(newLoc);
        if (onLocation) onLocation(newLoc);
      },
      error => {
        console.log('Watcher error:', error);
        if (isActiveRef.current) {
          clearWatch();
          retryTimerRef.current = setTimeout(() => isActiveRef.current && startWatcherOnce(), 5000);
        }
      },
      {
        enableHighAccuracy: highAccuracy,
        distanceFilter,
        interval,
        fastestInterval,
        timeout,
        maximumAge,
      },
    );
  };

  const startListening = () => {
    isActiveRef.current = true;
    clearRetry();
    clearWatch();
    retryAttemptRef.current = 0;

    const tryGetFast = () => {
      if (!isActiveRef.current) return;
      Geolocation.getCurrentPosition(
        position => {
          retryAttemptRef.current = 0;
          const newLoc = { lat: position.coords.latitude, long: position.coords.longitude };
          setLocation(newLoc);
          if (onLocation) onLocation(newLoc);
         
          startWatcherOnce();
        },
        error => {
          console.log('Location error:', error);
          if (!isActiveRef.current) return;
          const attempt = retryAttemptRef.current++;
          const delay = Math.min(2000 * Math.pow(1.5, attempt), 30000);
          clearRetry();
          if (attempt >= 5) {
            startWatcherOnce();
          } else {
            retryTimerRef.current = setTimeout(tryGetFast, delay);
          }
        },
        { enableHighAccuracy: highAccuracy, timeout, maximumAge }
      );
    };

    tryGetFast();
  };

  useEffect(() => {
    Geolocation.requestAuthorization(
      () => {
        console.log('Geolocation permission granted');
        startListening();
      },
      (error) => { 
        console.log('Geolocation permission denied', error);
        setLocation(null);
      }
    );

    return () => {
      isActiveRef.current = false;
      clearRetry();
      clearWatch();
    };
  }, []);

  return (
    <LocationListener.Provider value={{ location, startListening }}>
      {children}
    </LocationListener.Provider>
  );
}

export const useLocation = () => useContext(LocationListener);