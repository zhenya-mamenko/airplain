import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import themes from '@/constants/themes.json';
import { defaultTheme } from 'react-native-picasso';
import type { ThemeData } from '@/types';


const additions = {
  spacing: {
    xs: 4,
    smm: 12,
    mdl: 20,
  },
  font: {
    sizes: {
      mdl: 20,
      lgx: 28,
    },
  },
  radius: {
    xs: 3,
  },
}

const useTheme = (theme?: string): ThemeData => {
  const colors = themes[(theme || useDynamicColorScheme() || 'light') as keyof typeof themes];
  const result = {
    ...defaultTheme,
    ...colors,
  } as ThemeData;
  result.spacing = { ...result.spacing, ...additions.spacing };
  result.font = { ...result.font, ...additions.font };
  result.radius = { ...result.radius, ...additions.radius };
  return result;
}

export default useTheme;
