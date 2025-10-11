import React, { useState, createContext, forwardRef } from 'react';
import { useThemeColor } from '@/hooks/useColors';
import type { SkImage } from '@shopify/react-native-skia';
import type { ContextData, FlightsFilter } from '@/types';

interface GlobalProps {
  achievements: { image: SkImage | null | undefined; data: ContextData[] };
  stampsColors: {
    light: { [key: string]: string };
    dark: { [key: string]: string };
  };
  flightsFilter: FlightsFilter;
  setFlightsFilter: (flightsFilter: FlightsFilter) => void;
  setAchievements: (newAchievements: {
    image: SkImage | null;
    data: ContextData[];
  }) => void;
}

export const GlobalContext = createContext<GlobalProps>({
  achievements: { image: undefined, data: [] },
  stampsColors: {
    light: {},
    dark: {},
  },
  flightsFilter: { dateFrom: undefined, dateTo: undefined, airports: [] },
  setFlightsFilter: () => {},
  setAchievements: () => {},
});

export const GlobalContextProvider = forwardRef(
  ({ children }: { children: any }, ref) => {
    const [achievements, setAchievements] = useState<{
      image: SkImage | null | undefined;
      data: ContextData[];
    }>({ image: undefined, data: [] });
    const [flightsFilter, setFlightsFilter] = useState<FlightsFilter>({
      airports: [],
      dateFrom: undefined,
      dateTo: undefined,
    });

    const stampsColors = {
      light: {} as { [key: string]: string },
      dark: {} as { [key: string]: string },
    };
    for (const key in stampsColors) {
      [
        'gold',
        'blue',
        'blue_extra',
        'purple',
        'red',
        'red_extra',
        'green',
        'green_extra',
        'black',
      ].forEach((x: string) => {
        stampsColors[key as keyof typeof stampsColors][x] = useThemeColor(
          `stamps.${x}`,
          key as any,
        );
      });
    }

    return (
      <GlobalContext.Provider
        value={{
          achievements,
          flightsFilter,
          stampsColors,
          setFlightsFilter,
          setAchievements,
        }}
      >
        {children}
      </GlobalContext.Provider>
    );
  },
);
