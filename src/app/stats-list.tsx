// @ts-nocheck
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { ScrollView, TextStyle, ViewStyle } from 'react-native';
import { ThemeProvider, View } from 'react-native-picasso';
import { useAnimatedStyle } from 'react-native-reanimated';

import { StatsRowRendererProps, statsRowRenderers } from '@/components/Stats';
import t, { useLocale } from '@/helpers/localization';
import { useThemeColor } from '@/hooks/useColors';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import useTheme from '@/hooks/useTheme';

const StatsTop10 = () => {
  const { caption, value } = useLocalSearchParams<{
    caption: string;
    value: string;
  }>();
  const data: Array<any> = JSON.parse(value || '[]');
  const renderRow = statsRowRenderers[caption as keyof typeof statsRowRenderers];

  const headerTintColor = useThemeColor('textColors.primary');
  const backgroundColor = useThemeColor('colors.primary');
  const valueColor = useThemeColor('textColors.surface');
  const colorSurfaceVariant = useThemeColor('colors.surfaceVariant');
  const colorPrimaryContainer = useThemeColor('textColors.primaryContainer');
  const locale = useLocale();
  const themeName = useDynamicColorScheme() || 'light';
  const theme = useTheme(themeName);

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  };

  const captionStyle: TextStyle = {
    width: '12%',
    fontSize: 14,
    color: valueColor,
    textAlign: 'left',
    fontWeight: 'bold',
    fontVariant: ['small-caps'],
  };

  const captionTextStyle: TextStyle = {
    width: '78%',
    fontSize: 14,
    color: valueColor,
    textAlign: 'left',
    fontVariant: ['small-caps'],
  };

  const captionCountStyle: TextStyle = {
    width: '10%',
    fontSize: 12,
    color: valueColor,
    fontWeight: 'bold',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  };

  const captionTextStyleLong: TextStyle = {
    width: '90%',
    fontSize: 14,
    color: valueColor,
    textAlign: 'left',
    fontVariant: ['small-caps'],
  };

  const animatedStyle = useAnimatedStyle(() => ({}), []);

  const rendererProps: StatsRowRendererProps = {
    animatedStyle,
    captionStyle,
    captionTextStyle,
    captionTextStyleLong,
    captionCountStyle,
    rowStyle,
    colorPrimaryContainer,
    locale,
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t(`stats.${caption}`),
          headerTintColor,
          headerStyle: {
            backgroundColor,
          },
          headerBackVisible: true,
        }}
      />
      <ThemeProvider theme={theme}>
        <ScrollView keyboardShouldPersistTaps="always" style={{ flex: 1, backgroundColor: colorSurfaceVariant }}>
          <View className="bg-surfaceVariant flex-column flex-1">
            <View className="flex-column alignitems-start justifycontent-start bg-surface m-sm mt-md pb-md radius-md b-1 bordercolor-outline elevated">
              <View className="flex-column px-md pt-md">
                {data.slice(0, 10).map((item, index) => renderRow(item, index, rendererProps))}
              </View>
            </View>
          </View>
        </ScrollView>
      </ThemeProvider>
    </>
  );
};

export default StatsTop10;
