import React, { useState } from 'react';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Button from '@/components/Button';
import { CameraView, BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { View } from 'react-native-picasso';
import { loadPKPass, createPKPass, scanBarcode as scan, decodeBCBP, BCBPFormatMap } from '@/helpers/boardingpass';
import { useThemeColor } from '@/hooks/useColors';
import t from '@/helpers/localization';
import { Dimensions, Modal, StyleSheet, ToastAndroid } from 'react-native';


const LoadBCBPOptions = (props: {today?: Date, dispatch: any, showToast?: boolean}) => {
  const {today = new Date(), dispatch, showToast = true } = props;
  const [permission, requestPermission] = useCameraPermissions();
  const colorPrimary = useThemeColor('textColors.primary');
  const [cameraModal, setCameraModal] = useState(false);

  const { width, height } = Dimensions.get('window');

  const setFlightDataFromBCBP = (leg: any) => {
    dispatch({
      type: 'search',
      value: {
        airline: leg.operatingCarrierDesignator,
        flightNumber: leg.flightNumber.replace(/^0+/, ''),
        departureDate: leg.flightDate ?? today,
      }
    });
    if (showToast) ToastAndroid.show(t('add.check_flight_date'), ToastAndroid.SHORT);
  }

  const openPKpass = () => {
    DocumentPicker.getDocumentAsync({ type: ['application/octet-stream', 'application/vnd.apple.pkpass'] }).then(
      async (result) => {
        if (!result.canceled) {
          const pkpass = await loadPKPass(result.assets[0].uri);
          if (!!pkpass) {
            const bcbp = decodeBCBP(pkpass.barcode.message);
            if (!!bcbp) {
              setFlightDataFromBCBP(bcbp?.data?.legs?.[0]);
              dispatch({
                type: 'bcbp',
                value: {
                  data: bcbp,
                  format: pkpass.barcode.format,
                  pkpass,
                }
              });
            }
          }
        }
    });
  }

  const scanImage = () => {
    const pickerOptions: ImagePicker.ImagePickerOptions = {
      allowsEditing: true,
      legacy: true,
      exif: false,
    }

    ImagePicker.launchImageLibraryAsync(pickerOptions).then(
      async (result) => {
        if (!result.canceled) {
          const { bcbp, format } = await scan(result.assets[0].uri);
          if (!!bcbp && !!format) {
            const bcbpData = decodeBCBP(bcbp);
            if (!!bcbpData && (bcbpData?.data?.legs?.length ?? 0) > 0) {
              setFlightDataFromBCBP(bcbpData?.data?.legs?.[0]);
              const pkpass = await createPKPass(bcbp, format);
              if (!!pkpass) {
                dispatch({
                  type: 'bcbp',
                  value: {
                    data: bcbpData,
                    format,
                    pkpass,
                  }
                });
              }
            }
          }
        }
    });
  }

  const scanBarcode = async (result: BarcodeScanningResult) => {
    const { data, type, raw } = result;
    const bcbp = raw ?? data;
    if (!!bcbp && !!type) {
      const bcbpData = decodeBCBP(bcbp);
      if (!!bcbpData && (bcbpData?.data?.legs?.length ?? 0) > 0) {
        setCameraModal(false);
        setFlightDataFromBCBP(bcbpData?.data?.legs?.[0]);
        const format = BCBPFormatMap[type];
        const pkpass = await createPKPass(bcbp, format);
        if (!!pkpass) {
          dispatch({
            type: 'bcbp',
            value: {
              data: bcbpData,
              format,
              pkpass,
            }
          });
        }
      }
    }
  }


  return (
    <>
      <Modal
        animationType='slide'
        key={`Modal${cameraModal ? 'visible' : 'hidden'}`}
        transparent={false}
        visible={ cameraModal }
        onRequestClose={ () => setCameraModal(false) }
      >
        <View
          className='flex-column alignitems-center justifycontent-center flex-1 bg-surfaceVariant'
        >
          <View
            className='b-3 bordercolor-secondary radius-sm p-md'
            style={{
              height: width < height ? width * 0.8 : height * 0.8,
              width: width < height ? width * 0.8 : height * 0.8,
            }}
          >
            <CameraView
              barcodeScannerSettings={{
                barcodeTypes: ['aztec', 'datamatrix', 'qr', 'pdf417'],
              }}
              style={ StyleSheet.absoluteFillObject }
              onBarcodeScanned={ scanBarcode }
            />
          </View>
          <Button
            className='mt-lg'
            title={ t('buttons.close') }
            onPress={ () => setCameraModal(false) }
          />
        </View>
      </Modal>

      <View
        className='flex-column'
        style={{ width: '100%'}}
      >
        <Button
          className='bg-secondary px-lg justifycontent-start'
          leftIcon={ <Icon name='passport-biometric' size={20} color={colorPrimary} /> }
          textClass='ml-lg'
          title={ t('add.open_pkpass') }
          uppercase={false}
          onPress={ openPKpass }
        />
      </View>
      <View
        className='mt-md flex-column'
        style={{ width: '100%'}}
      >
        <Button
          className='bg-secondary px-lg justifycontent-start'
          leftIcon={ <Icon name='line-scan' size={20} color={colorPrimary} /> }
          textClass='ml-lg'
          title={ t('add.scan_barcode') }
          uppercase={false}
          onPress={() => {
            if (!permission?.granted) {
              requestPermission();
            } else {
              setCameraModal(true);
            }
          }}
        />
      </View>
      <View
        className='mt-md flex-column'
        style={{ width: '100%'}}
      >
        <Button
          className='bg-secondary px-lg justifycontent-start'
          leftIcon={ <Icon name='barcode-scan' size={20} color={colorPrimary} /> }
          textClass='ml-lg'
          title={ t('add.scan_image') }
          uppercase={false}
          onPress={ scanImage }
        />
      </View>
    </>
  );
}

export default LoadBCBPOptions;
