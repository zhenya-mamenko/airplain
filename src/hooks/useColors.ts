import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import { ColorSchemeName } from 'react-native';
import themes from '@/constants/themes.json';
import palettes from '@/constants/palettes.json';

export const useThemeColor = (
  colorName: string,
  themeName?: ColorSchemeName,
): string => {
  const theme = themeName ?? useDynamicColorScheme() ?? 'light';

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

export const useThemeColors = (
  colorNames: Array<string>,
  themeName?: ColorSchemeName,
): Array<string> => {
  const theme = themeName ?? useDynamicColorScheme() ?? 'light';
  return colorNames.map((colorName) => useThemeColor(colorName, theme));
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

export const usePaletteColor = (
  colorId: keyof typeof preparedPalette,
): string => {
  return preparedPalette[colorId];
};
