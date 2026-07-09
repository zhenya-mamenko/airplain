import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import * as DocumentPicker from 'expo-document-picker';
import { ToastAndroid } from 'react-native';
import ImagePicker, { Options } from 'react-native-image-crop-picker';
import { View } from 'react-native-picasso';

import Button from '@/components/Button';
import { createPKPass, decodeBCBP, loadPKPass, scanBarcode as scan } from '@/helpers/boardingpass';
import t from '@/helpers/localization';
import { useThemeColor } from '@/hooks/useColors';
import useDynamicColorScheme from '@/hooks/useDynamicColorScheme';
import { BCBPFormat } from '@/types';

const LoadBCBPOptions = (props: { today?: Date; dispatch: any; showToast?: boolean }) => {
  const { today = new Date(), dispatch, showToast = true } = props;
  const colorPrimary = useThemeColor('textColors.primary');
  const isLightTheme = (useDynamicColorScheme() || 'light') === 'light';

  const setFlightDataFromBCBP = (leg: any) => {
    dispatch({
      type: 'search',
      value: {
        airline: leg.operatingCarrierDesignator,
        flightNumber: leg.flightNumber.replace(/^0+/, ''),
        departureDate: leg.flightDate ?? today,
      },
    });
    if (showToast) ToastAndroid.show(t('add.check_flight_date'), ToastAndroid.SHORT);
  };

  const openPKpass = () => {
    DocumentPicker.getDocumentAsync({
      type: ['application/octet-stream', 'application/vnd.apple.pkpass'],
    }).then(async (result) => {
      if (!result.canceled) {
        const pkpass = await loadPKPass(result.assets[0].uri);
        if (pkpass) {
          const bcbp = decodeBCBP(pkpass.barcode.message);
          if (bcbp) {
            setFlightDataFromBCBP(bcbp?.data?.legs?.[0]);
            dispatch({
              type: 'bcbp',
              value: {
                data: bcbp,
                format: pkpass.barcode.format,
                pkpass,
              },
            });
          }
        }
      }
    });
  };

  const scanFromAsset = async (path: string) => {
    const { bcbp, format } = await scan(path);
    if (!!bcbp && !!format) {
      const bcbpData = decodeBCBP(bcbp);
      if (!!bcbpData && (bcbpData?.data?.legs?.length ?? 0) > 0) {
        setFlightDataFromBCBP(bcbpData?.data?.legs?.[0]);
        const pkpass = await createPKPass(bcbp, format as BCBPFormat);
        if (pkpass) {
          dispatch({
            type: 'bcbp',
            value: {
              data: bcbpData,
              format,
              pkpass,
            },
          });
        }
      }
    }
  };

  const pickerOptions: Options = {
    cropping: true,
    cropperNavigationBarLight: isLightTheme,
    cropperStatusBarLight: isLightTheme,
    cropperToolbarTitle: t('add.crop_image'),
    freeStyleCropEnabled: true,
    mediaType: 'photo',
    showCropGuidelines: false,
    showCropFrame: true,
  };
  const scanImage = async () => {
    try {
      const image = await ImagePicker.openPicker(pickerOptions);
      await scanFromAsset(image.path);
    } catch (error: any) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        console.warn(error);
      }
    }
  };

  const scanBarcode = async () => {
    try {
      const image = await ImagePicker.openCamera(pickerOptions);
      await scanFromAsset(image.path);
    } catch (error: any) {
      if (error?.code !== 'E_PICKER_CANCELLED') {
        console.warn(error);
      }
    }
  };

  return (
    <>
      <View className="flex-column" style={{ width: '100%' }}>
        <Button
          className="bg-secondary px-lg justifycontent-start"
          leftIcon={<Icon name="passport-biometric" size={20} color={colorPrimary} />}
          textClass="ml-lg"
          title={t('add.open_pkpass')}
          uppercase={false}
          onPress={openPKpass}
        />
      </View>
      <View className="mt-md flex-column" style={{ width: '100%' }}>
        <Button
          className="bg-secondary px-lg justifycontent-start"
          leftIcon={<Icon name="line-scan" size={20} color={colorPrimary} />}
          textClass="ml-lg"
          title={t('add.scan_barcode')}
          uppercase={false}
          onPress={scanBarcode}
        />
      </View>
      <View className="mt-md flex-column" style={{ width: '100%' }}>
        <Button
          className="bg-secondary px-lg justifycontent-start"
          leftIcon={<Icon name="barcode-scan" size={20} color={colorPrimary} />}
          textClass="ml-lg"
          title={t('add.scan_image')}
          uppercase={false}
          onPress={scanImage}
        />
      </View>
    </>
  );
};

export default LoadBCBPOptions;
