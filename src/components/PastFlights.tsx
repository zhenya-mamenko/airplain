import { useState, useEffect, useRef, useContext, useSyncExternalStore } from 'react';
import { AppState, FlatList } from 'react-native';
import { View } from 'react-native-picasso';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FlightCard from '@/components/FlightCard';
import type { Flight } from '@/types';
import { getPastFlights, type Condition } from '@/helpers/sqlite';
import { flightToFlightData } from '@/helpers/common';
import emitter from '@/helpers/emitter';
import { settings as _settings } from '@/constants/settings';
import { GlobalContext } from '@/components/GlobalContext';


export default function PastFlights() {
  const [refreshing, setRefreshing] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [timeoutId, setTimeoutId] = useState<any | null>(null);

  const flightsFilter = useContext(GlobalContext).flightsFilter;
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
    loadFlightsRef.current = async (refreshAnimation) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (!!refreshAnimation) setRefreshing(true);
      try {
        const filter: Array<Condition | string> = [];
        if (!!flightsFilter) {
          if (!!flightsFilter.dateFrom) {
            const value = flightsFilter.dateFrom.toISOString().substring(0, 10);
            filter.push({ field: 'substr(start_datetime, 1, 10)', operator: '>=', value });
          }
          if (!!flightsFilter.dateTo) {
            const value = flightsFilter.dateTo.toISOString().substring(0, 10);
            filter.push({ field: 'substr(start_datetime, 1, 10)', operator: '<=', value });
          }
          if (!!flightsFilter.airports && flightsFilter.airports.length > 0) {
            const value = flightsFilter.airports.join("','");
            filter.push(`((departure_airport IN ('${value}')) OR (arrival_airport IN ('${value}')))`);
          }
        };
        const flights = await getPastFlights(filter, settings.FLIGHTS_LIMIT);
        setFlights(flights);
        setTimeoutId(setTimeout(() => {
          loadFlightsRef.current(false);
        }, settings.REFRESH_INTERVAL * 60000));
      } catch (e) {
        console.error(e);
      } finally {
        setRefreshing(false);
      }
    };
    loadFlightsRef.current(true);
  }, [flightsFilter]);

  useEffect(() => {
    const callback = (refreshing: boolean) => loadFlightsRef.current(refreshing);
    emitter.on('updatePastFlights', callback);

    return () => emitter.off('updatePastFlights', callback);
  }, []);

  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && ['background', 'inactive'].includes(appState.current)) {
        loadFlightsRef.current(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      appStateListener.remove();
    }
  }, []);

  const renderFlight = ({ item }: { item: Flight }) => {
    return <FlightCard data={flightToFlightData(item)} />;
  };

  return (
    <GestureHandlerRootView>
      <View
        className='bg-surfaceVariant flex-1'
      >
        <FlatList
          data={ flights }
          keyboardShouldPersistTaps='always'
          keyExtractor={ (item: Flight, index: number) => item.flightId?.toString() ?? index.toString() }
          refreshing={ refreshing }
          renderItem={ renderFlight }
          style={{ padding: 8 }}
          onRefresh={ () => loadFlightsRef.current(true) }
        />
      </View>
    </GestureHandlerRootView>
  );
}
