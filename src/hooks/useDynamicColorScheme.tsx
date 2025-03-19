import { useState, useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';


const useDynamicColorScheme = () => {
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });

    return () => listener.remove();
  }, []);

  return colorScheme;
};

export default useDynamicColorScheme;
