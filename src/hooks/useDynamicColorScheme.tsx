import { useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export type AppColorScheme = 'light' | 'dark';

const normalizeColorScheme = (colorScheme: ColorSchemeName | null | undefined): AppColorScheme =>
  colorScheme === 'dark' ? 'dark' : 'light';

const useDynamicColorScheme = () => {
  const [colorScheme, setColorScheme] = useState<AppColorScheme>(() => normalizeColorScheme(Appearance.getColorScheme()));

  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(normalizeColorScheme(colorScheme));
    });

    return () => listener.remove();
  }, []);

  return colorScheme;
};

export default useDynamicColorScheme;
