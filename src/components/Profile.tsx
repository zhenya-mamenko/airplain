import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Pressable,
  Modal,
} from 'react-native';
import { View, Text } from 'react-native-picasso';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import t from '@/helpers/localization';
import { DataCard, Input, Value } from '@/components/DataCard';
import { useThemeColor } from '@/hooks/useColors';
import { Canvas, Image, Path } from '@shopify/react-native-skia';
import { isPointInPolygon } from '@/helpers/algs';
import { GlobalContext } from '@/components/GlobalContext';
import emitter from '@/helpers/emitter';
import { getSetting, setSetting } from '@/constants/settings';
import type { ContextData } from '@/types';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';

export default function Profile() {
  const colorSecondaryContainer = useThemeColor(
    'textColors.secondaryContainer',
  );
  const colorSurface = useThemeColor('textColors.surface');
  const colorPrimary = useThemeColor('colors.primary');
  const colorGray = useThemeColor('textColors.gray');
  const themeName = useDynamicColorScheme() ?? 'light';

  const height = Dimensions.get('screen').height;

  const [achievementsHeight, setAchievementsHeight] = useState(0);
  const [content, setContent] = useState<JSX.Element>();
  const [canvasHeight, setCanvasHeight] = useState<number>(0);
  const { achievements, stampsColors } = useContext(GlobalContext);

  const [canShare, setCanShare] = useState(false);
  Sharing.isAvailableAsync().then((result) => {
    setCanShare(result && achievements && achievements.data.length > 0);
  });

  const handleLayout = (event: any) => {
    if (!event?.nativeEvent?.layout) return;
    const h = height - 250 - event.nativeEvent.layout.height;
    setAchievementsHeight(h);
  };

  useEffect(() => {
    const refreshAchievementsCallback = async () => {
      const cachedImage = achievements.image;
      if (!!cachedImage) {
        setCanvasHeight(cachedImage.height() / 2);
        setContent(
          <Image
            image={cachedImage}
            x={0}
            y={0}
            width={cachedImage.width() / 2}
            height={cachedImage.height() / 2}
          />,
        );
      } else if (cachedImage === null) {
        setCanvasHeight(0);
        setContent(<View />);
      } else {
        setCanvasHeight(0);
        setContent(undefined);
      }
    };
    refreshAchievementsCallback();
  }, [achievements, themeName]);

  const [achievement, setAchievement] = useState<ContextData>();
  const [modalContentTop, setModalContentTop] = useState(height);
  const [firstname, setFirstname] = useState(getSetting('firstname', ''));
  const [surname, setSurname] = useState(getSetting('surname', ''));
  const [notes, setNotes] = useState(getSetting('notes', ''));

  const handleTouchStart = async (x: number, y: number) => {
    for (const a of achievements.data) {
      if (isPointInPolygon({ x, y }, a.hull)) {
        setAchievement(a);
      }
    }
  };

  const handleLayoutModal = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setModalContentTop(Dimensions.get('screen').height - height - 32);
  };

  const dataCardOnSave = async (values: { [key: string]: string }) => {
    const { notes, firstname, surname } = values;
    if (!!notes) {
      setNotes(notes);
      setSetting('notes', notes);
    }
    if (!!firstname) {
      setFirstname(firstname);
      setSetting('firstname', firstname);
    }
    if (!!surname) {
      setSurname(surname);
      setSetting('surname', surname);
    }
  };

  const ref = useRef(null);

  return (
    <View className="flex-1 bg-surfaceVariant p-sm pt-sm">
      <DataCard
        caption={
          <View className="flex-row alignitems-end">
            <Icon
              name="notebook-outline"
              size={16}
              color={colorSecondaryContainer}
              style={{ marginBottom: 1 }}
            />
            <Text className="size-smm weight-bold mt-xs color-secondaryContainer ml-sm">
              {t('profile.data').toLocaleUpperCase()}
            </Text>
          </View>
        }
        key="data"
        onLayout={handleLayout}
        onSave={dataCardOnSave}
      >
        <View className="flex-column">
          <View className="flex-row my-sm">
            <Value
              caption={t('profile.firstname')}
              value={firstname}
              width="50%"
            />
            <Value caption={t('profile.surname')} value={surname} width="50%" />
          </View>
          <View className="flex-row mb-sm">
            <Value caption={t('profile.notes')} lines={4} value={notes} />
          </View>
        </View>
        <View className="flex-column">
          <View className="flex-row my-sm">
            <Input
              caption={t('profile.firstname')}
              field="firstname"
              value={firstname}
              width="50%"
            />
            <Input
              caption={t('profile.surname')}
              field="surname"
              value={surname}
              width="50%"
            />
          </View>
          <View className="flex-row mb-sm">
            <Input
              caption={t('profile.notes')}
              field="notes"
              lines={4}
              value={notes}
            />
          </View>
        </View>
      </DataCard>
      <DataCard
        caption={
          <View className="flex-row alignitems-end">
            <Icon
              name="podium-gold"
              size={16}
              color={colorSecondaryContainer}
              style={{ marginBottom: 1 }}
            />
            <Text className="size-smm weight-bold mt-xs color-secondaryContainer ml-sm">
              {t('profile.achievements').toLocaleUpperCase()}
            </Text>
          </View>
        }
        dataClassName="radiusbr-md radiusbl-md bg-background"
        key="achievements"
        rightBlock={
          <View className="flex-row">
            {canShare && (
              <Pressable
                hitSlop={5}
                onPress={async () => {
                  await Sharing.shareAsync(
                    `${FileSystem.cacheDirectory}achievements-share.png`,
                    { mimeType: 'image/png' },
                  );
                }}
              >
                <Icon
                  name="share-variant"
                  size={16}
                  color={colorGray}
                  style={{ marginTop: 4, marginRight: 16 }}
                />
              </Pressable>
            )}
            <Pressable
              hitSlop={5}
              onPress={() => {
                setSetting('achievements_hash', 'refresh');
                setContent(undefined);
                emitter.emit('refreshAchievements');
              }}
            >
              <Icon
                name="refresh"
                size={20}
                color={colorGray}
                style={{ marginTop: 2 }}
              />
            </Pressable>
          </View>
        }
      >
        <ScrollView style={{ height: achievementsHeight }}>
          {!content ? (
            <ActivityIndicator
              color={colorPrimary}
              size="large"
              style={{ height: achievementsHeight, width: '100%' }}
            />
          ) : (
            <Pressable
              onPress={(e) =>
                handleTouchStart(
                  e.nativeEvent.locationX,
                  e.nativeEvent.locationY,
                )
              }
            >
              <Canvas style={{ width: '100%', height: canvasHeight }}>
                {content}
              </Canvas>
            </Pressable>
          )}
        </ScrollView>
      </DataCard>
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!achievement}
        onRequestClose={() => setAchievement(undefined)}
      >
        <Pressable onPress={() => setAchievement(undefined)}>
          <View
            className="flex-row justifycontent-end"
            style={{
              width: '100%',
              position: 'absolute',
              top: modalContentTop + 16,
              right: 16,
              zIndex: 1,
            }}
          >
            {canShare && (
              <Pressable
                hitSlop={5}
                onPress={async () => {
                  const uri = await captureRef(ref, {
                    format: 'png',
                    result: 'tmpfile',
                  });
                  await Sharing.shareAsync(uri, { mimeType: 'image/png' });
                }}
              >
                <Icon
                  name="share-variant"
                  size={20}
                  color={colorPrimary}
                  style={{}}
                />
              </Pressable>
            )}
          </View>
          <View
            className="flex-column p-md bg-background alignitems-center justifycontent-start b-1 bordercolor-outline radius-md elevated"
            ref={ref}
            style={{ top: modalContentTop }}
            onLayout={handleLayoutModal}
          >
            <View className="flex-row pb-sm mt-md bg-background alignitems-between justifycontent-center">
              <Text className="flex-column size-xxl weight-bold color-surface">
                {!!achievement ? achievement.achievement.departureAirport : ''}
              </Text>
              <FontAwesome5
                color={colorSurface}
                name="plane"
                size={24}
                style={{
                  width: 26,
                  height: 26,
                  marginBottom: 12,
                  marginHorizontal: 24,
                }}
              />
              <Text className="flex-column size-xxl weight-bold color-surface">
                {!!achievement ? achievement.achievement.arrivalAirport : ''}
              </Text>
            </View>
            <Text className="size-md color-primaryContainer mb-xl">
              {!!achievement ? achievement.achievement.date : ''}
            </Text>
            <Canvas style={{ width: 256, height: 256 }}>
              {!!achievement &&
                achievement.achievement.svg.map((path: any, index: number) => (
                  <Path
                    color={stampsColors[themeName][achievement.color]}
                    key={`path-${index}`}
                    path={path}
                  />
                ))}
            </Canvas>
            <Text className="size-md color-primaryContainer my-xl">
              {!!achievement ? achievement.achievement.name : ''}
            </Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
