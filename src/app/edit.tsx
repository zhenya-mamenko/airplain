import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import EditFlight from '@/components/EditFlight';
import { makeDateLabel } from '@/helpers/datetime';
import { useLocale } from '@/helpers/localization';
import { getFlight } from '@/helpers/sqlite';
import { useThemeColor } from '@/hooks/useColors';
import type { Flight } from '@/types';

export default function Edit() {
  const { flightId } = useLocalSearchParams<{ flightId: string }>();
  const [flight, setFlight] = useState<Flight>();
  const navigation = useNavigation();

  const colorPrimary = useThemeColor('colors.primary');
  const colorSurfaceVariant = useThemeColor('colors.surfaceVariant');

  const locale = useLocale();

  useEffect(() => {
    getFlight(parseInt(flightId)).then((flight) => {
      if (flight) {
        const departureDate = new Date(flight.actualStartDatetime ?? flight.startDatetime);
        const arrivalDate = new Date(flight.actualEndDatetime ?? flight.endDatetime);
        const dateLabel = makeDateLabel(
          departureDate,
          flight.departureAirportTimezone ?? 'UTC',
          arrivalDate,
          flight.arrivalAirportTimezone ?? 'UTC',
          locale,
        );
        navigation?.setOptions({
          title: `${flight.airline} ${flight.flightNumber}, ${dateLabel}`,
        });
        setFlight(flight);
      }
    });
  }, [flightId, navigation, locale]);

  return (
    <SafeAreaProvider>
      <View
        style={{
          backgroundColor: colorSurfaceVariant,
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          margin: 0,
        }}
      >
        {flight ? <EditFlight data={flight} /> : <ActivityIndicator size="large" color={colorPrimary} />}
      </View>
    </SafeAreaProvider>
  );
}
