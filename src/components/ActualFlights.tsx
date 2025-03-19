import { useState, useEffect, useRef, memo, useSyncExternalStore } from 'react';
import { AppState, FlatList } from 'react-native';
import * as Notifications from 'expo-notifications';
import { View } from 'react-native-picasso';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlightCard from '@/components/FlightCard';
import LandedFlightCard from '@/components/LandedFlightCard';
import DepartingFlightCard from '@/components/DepartingFlightCard';
import type { Flight } from '@/types';
import { flightToDepartingFlightData, flightToFlightData, flightToLandedFlightData, startBackgroundTask, stopBackgroundTask } from '@/helpers/common';
import emitter from '@/helpers/emitter';
import { fetchActualFlights } from '@/helpers/airdata';
import { settings as _settings } from '@/constants/settings';
import { useLocalSearchParams } from 'expo-router';


const ActualFlights = memo((props: { now?: Date }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);

  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadFlightsRef = useRef((refreshAnimation?: boolean) => {});

  const subscribe = (callback: Function) => {
    const update = () => callback();
    emitter.on('updateSettings', update);

    return () => {
      emitter.off('updateSettings', update);
    };
  }

  const settings = useSyncExternalStore(subscribe, () => _settings );

  useEffect(() => {
    Notifications.requestPermissionsAsync();

    loadFlightsRef.current = async (refreshAnimation) => {
      if (!!timeoutId.current) {
        clearTimeout(timeoutId.current);
        timeoutId.current = null;
      }
      if (refreshAnimation) setRefreshing(true);
      try {
        if (settings.ONLY_MANUAL_REFRESH === 'false' || refreshAnimation) {
          const flights = await fetchActualFlights(props.now ?? new Date(), refreshAnimation);
          if (flights.length !== 0) {
            if (settings.ONLY_MANUAL_REFRESH === 'false') startBackgroundTask();
          } else {
            stopBackgroundTask();
          }
          setFlights(flights);
        }
        const tId = setTimeout(() => loadFlightsRef.current(false), settings.REFRESH_INTERVAL * 60000);
        timeoutId.current = tId;
      } catch (e) {
        console.error(e);
      } finally {
        setRefreshing(false);
      }
    };
    loadFlightsRef.current(true);

    const callback = (refreshing: boolean) => loadFlightsRef.current(refreshing);
    emitter.on('updateActualFlights', callback);

    return () => emitter.off('updateActualFlights', callback);
  }, []);

  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && ['background', 'inactive'].includes(appState.current)) {
        loadFlightsRef.current(true);
      }
      appState.current = nextAppState;
    });

    return () => {
      appStateListener.remove();
    }
  }, []);

  const renderFlight = ({ item }: { item: Flight }) => {
    if (item.isArchived) {
      return <FlightCard data={ flightToFlightData(item) } />;
    }
    const sd = new Date(item.actualStartDatetime ?? item.startDatetime).getTime() / 1000;
    const cd = new Date().getTime() / 1000;
    if ((sd - cd > 0) && (sd - cd < 3600 * 4)) {
      return <DepartingFlightCard data={ flightToDepartingFlightData(item) } />;
    }
    if (item.status === 'arrived') {
      return <LandedFlightCard data={ flightToLandedFlightData(item) } />;
    }
    return <FlightCard data={ flightToFlightData(item) } />;
  };

  const { flightId } = useLocalSearchParams();
  const ref = useRef<FlatList>(null);
  useEffect(() => {
    if (flights && flights.length > 0 && typeof flightId === 'string' && ref.current) {
      const index = flights.findIndex(x => x.flightId === parseInt(flightId));
      if (index !== -1) {
        ref.current.scrollToIndex({ animated: true, index });
      }
    }
  }, [flightId]);

  return (
    <GestureHandlerRootView>
      <View
        className='bg-surfaceVariant flex-1'
      >
        <FlatList
          data={ flights }
          keyboardShouldPersistTaps='always'
          keyExtractor={ (item: Flight, index: number) => item.flightId?.toString() ?? index.toString() }
          ref={ ref }
          refreshing={ refreshing }
          renderItem={ renderFlight }
          style={{ padding: 8 }}
          onRefresh={ () => loadFlightsRef.current(true) }
        />
      </View>
    </GestureHandlerRootView>
  );
});

export default ActualFlights;
