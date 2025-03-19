import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import themes from '@/constants/themes.json';
import { defaultTheme } from 'react-native-picasso';
import type { ThemeData } from '@/types';


const useTheme = (theme?: string): ThemeData => {
  const colors = themes[(theme || useDynamicColorScheme() || 'light') as keyof typeof themes];
  const result = {
    ...defaultTheme,
    ...colors,
  } as ThemeData;
  result.spacing.xs = 4;
  result.spacing.smm = 12;
  result.spacing.mdl = 20;
  result.font.sizes.mdl = 20;
  result.font.sizes.lgx = 28;
  result.radius.xs = 3;
  return result;
}

export default useTheme;
