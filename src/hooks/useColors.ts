import { ColorSchemeName } from 'react-native';

import palettes from '@/constants/palettes.json';
import themes from '@/constants/themes.json';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';

type ThemeName = keyof typeof themes;

const resolveTheme = (themeName: ColorSchemeName | undefined, dynamicTheme: ThemeName): ThemeName =>
  themeName === 'light' || themeName === 'dark' ? themeName : dynamicTheme;

const getThemeColor = (colorName: string, theme: ThemeName): string => {
  const parts = colorName.split('.');
  let color = themes[theme];
  while (parts.length > 0) {
    if (typeof color === 'object') {
      color = color[parts.shift() as keyof typeof color] as any;
    } else {
      break;
    }
  }
  return color as unknown as string;
};

export const useThemeColor = (colorName: string, themeName?: ColorSchemeName): string => {
  const dynamicTheme = useDynamicColorScheme();
  return getThemeColor(colorName, resolveTheme(themeName, dynamicTheme));
};

export const useThemeColors = (colorNames: Array<string>, themeName?: ColorSchemeName): Array<string> => {
  const dynamicTheme = useDynamicColorScheme();
  const theme = resolveTheme(themeName, dynamicTheme);
  return colorNames.map((colorName) => getThemeColor(colorName, theme));
};

const preparedPalette = {} as Record<string, string>;
for (const palette in palettes) {
  const prefix = palette
    .split('-')
    .map((part) => part.substring(0, 1).toUpperCase())
    .join('');
  for (const key in (palettes as any)[palette]) {
    preparedPalette[`${prefix}-${key}`] = (palettes as any)[palette][key];
  }
}

export const usePaletteColor = (colorId: keyof typeof preparedPalette): string => {
  return preparedPalette[colorId];
};
