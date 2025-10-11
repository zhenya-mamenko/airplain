import React, { useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import * as Brightness from 'expo-brightness';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { View, Text } from 'react-native-picasso';
import {
  azteccode,
  pdf417,
  qrcode,
  datamatrix,
  RenderOptions,
} from '@bwip-js/react-native';
import { Image, useImage } from 'expo-image';
import { parsefncMessage } from '@/helpers/boardingpass';
import type { PKPassAsset, PKPassData, BCBPFormat } from '@/types';

interface BarCodeProps extends React.ComponentProps<typeof Image> {
  format: BCBPFormat;
  options: RenderOptions;
}

const BarCode = ({ format, options, ...rest }: BarCodeProps) => {
  const [img, setImg] = React.useState<{
    uri: string;
    height: number;
    width: number;
  } | null>(null);

  React.useEffect(() => {
    const generateBarcode = async () => {
      try {
        let generatedImg = null;
        switch (format) {
          case 'PKBarcodeFormatAztec':
            generatedImg = await azteccode(options);
            break;
          case 'PKBarcodeFormatDataMatrix':
            generatedImg = await datamatrix(options);
            break;
          case 'PKBarcodeFormatPDF417':
            generatedImg = await pdf417(options);
            break;
          case 'PKBarcodeFormatQR':
            generatedImg = await qrcode(options);
            break;
          default:
            console.error('Unsupported barcode format:', format);
            generatedImg = null;
            return;
        }
        setImg(generatedImg);
      } catch (e) {
        console.error(e);
      }
    };

    generateBarcode();
  }, [format, options]);

  if (!img) {
    return null;
  }

  return (
    <Image
      recyclingKey={`${new Date().valueOf()}`}
      source={{ uri: img.uri }}
      {...rest}
      style={{ height: img.height, width: img.width, ...rest.style }}
    />
  );
};

const BoardingPass = (props: { pkpass: PKPassData }) => {
  const { airline, barcode, boardingPass, colors, images } = props.pkpass;

  const brightness = useRef(0);
  (async () => {
    const level = await Brightness.getBrightnessAsync();
    brightness.current = level;
    await Brightness.setBrightnessAsync(1);
  })();
  useEffect(() => {
    return () => {
      if (brightness.current !== 0) {
        Brightness.setBrightnessAsync(brightness.current);
      }
    };
  }, []);

  interface FieldProps extends React.ComponentProps<typeof View> {
    label: string;
    value: string;
    labelProps?: React.ComponentProps<typeof Text>;
    valueProps?: React.ComponentProps<typeof Text>;
  }

  const Field = ({ label, value, ...rest }: FieldProps) => {
    return (
      <View
        {...rest}
        className={
          rest.className
            ? rest.className + ' flex-1 flex-column'
            : 'flex-1 flex-column'
        }
      >
        <Text
          {...rest.labelProps}
          className={
            (rest.labelProps as any).className
              ? (rest.labelProps as any).className + ' size-sm'
              : 'size-sm'
          }
          style={{
            color: colors.labelColor,
            ...(rest.labelProps as any).style,
          }}
        >
          {label}
        </Text>
        <Text
          {...rest.valueProps}
          className={
            (rest.valueProps as any).className
              ? (rest.valueProps as any).className + ' size-md'
              : 'size-md'
          }
          style={{
            color: colors.foregroundColor,
            ...(rest.valueProps as any).style,
          }}
        >
          {value}
        </Text>
      </View>
    );
  };

  interface FieldsProps extends React.ComponentProps<typeof View> {
    fields: Array<{ label?: string; key: string; value: string }>;
  }

  const Fields = ({ fields, ...rest }: FieldsProps) => {
    return (
      <>
        {fields.map((f, index) => {
          const labelProps = { className: 'align-center' };
          const valueProps = { className: 'align-center' };
          if (index === 0) {
            labelProps.className = 'align-left';
            valueProps.className = 'align-left';
          } else if (index === fields.length - 1) {
            labelProps.className = 'align-right';
            valueProps.className = 'align-right';
          }
          return (
            <Field
              key={f.key}
              label={f.label ?? f.key}
              labelProps={labelProps}
              value={f.value}
              valueProps={valueProps}
              {...rest}
            />
          );
        })}
      </>
    );
  };

  interface AssetImageProps extends React.ComponentProps<typeof Image> {
    asset?: PKPassAsset;
    maxHeight?: number; // icon: 29, logo: 50, footer: 15
    maxWidth?: number; // icon: 29, logo: 160, footer: 286
  }
  const AssetImage = ({
    asset,
    maxHeight,
    maxWidth,
    ...rest
  }: AssetImageProps) => {
    let image = null;
    if (asset && asset.image) {
      const data = useImage(asset.image);
      if (!data) {
        return null;
      }
      let scale = asset.ratio;
      if (data.height > (maxHeight ?? 50) * scale) {
        scale = data.height / (maxHeight ?? 50);
      }
      if (data.width > (maxWidth ?? 160) * scale) {
        scale = data.width / (maxWidth ?? 160);
      }
      image = (
        <Image
          {...rest}
          source={data}
          style={{
            width: data.width / scale,
            height: data.height / scale,
            ...rest.style,
          }}
        />
      );
    }
    return image;
  };

  const maxImageWidth = useWindowDimensions().width * 0.8;

  return (
    <View
      className="flex-1 flex-column justifycontent-start p-lg"
      style={{
        backgroundColor: colors.backgroundColor,
        position: 'absolute',
        height: '100%',
        width: '100%',
      }}
    >
      <View className="flex-row alignitems-start justifycontent-between">
        {images.logo ? (
          <AssetImage asset={images.logo} />
        ) : (
          <Text className="size-md" style={{ color: colors.foregroundColor }}>
            {airline}
          </Text>
        )}
        {boardingPass.headerFields ? (
          <Fields
            fields={boardingPass.headerFields}
            className="alignitems-end"
          />
        ) : null}
      </View>
      {boardingPass.primaryFields && boardingPass.primaryFields.length == 2 ? (
        <View className="flex-row alignitems-end justifycontent-between mt-lg mb-md">
          <Field
            label={
              boardingPass.primaryFields[0].label ??
              boardingPass.primaryFields[0].key
            }
            labelProps={{ className: 'size-sm' }}
            style={{ width: '35%' }}
            value={boardingPass.primaryFields[0].value}
            valueProps={{
              style: { color: colors.foregroundColor, fontSize: 48 },
            }}
          />
          <View
            className="flex-1 flex-row justifycontent-center alignitems-end"
            style={{ height: '100%', width: '30%' }}
          >
            <FontAwesome5
              color={colors.foregroundColor}
              name="plane"
              size={24}
              style={{ width: 26, height: 26, marginBottom: 16 }}
            />
          </View>
          <Field
            className="alignitems-end"
            label={
              boardingPass.primaryFields[1].label ??
              boardingPass.primaryFields[1].key
            }
            labelProps={{ className: 'size-sm align-right' }}
            style={{ width: '35%' }}
            value={boardingPass.primaryFields[1].value}
            valueProps={{
              className: 'align-right',
              style: { color: colors.foregroundColor, fontSize: 48 },
            }}
          />
        </View>
      ) : null}
      {boardingPass.auxiliaryFields &&
      boardingPass.auxiliaryFields.length > 0 ? (
        <View
          className="flex-row alignitems-start justifycontent-between my-md"
          style={{ height: 48 }}
        >
          <Fields fields={boardingPass.auxiliaryFields} />
        </View>
      ) : null}
      {boardingPass.secondaryFields &&
      boardingPass.secondaryFields.length > 0 ? (
        <View className="flex-row alignitems-start justifycontent-between my-md">
          <Fields fields={boardingPass.secondaryFields} />
        </View>
      ) : null}
      <AssetImage
        asset={images.footer}
        maxHeight={(maxImageWidth / 286) * 15}
        maxWidth={maxImageWidth}
        style={{ alignSelf: 'center' }}
      />
      {barcode && barcode.message ? (
        <View className="flex-1 flex-column alignitems-center justifycontent-start">
          <View
            className="p-md b-1 radius-md mt-md"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor:
                colors.backgroundColor === '#FFFFFF'
                  ? colors.foregroundColor
                  : '#FFFFFF',
            }}
          >
            <BarCode
              format={barcode.format as any}
              options={{
                barcolor: '#000000',
                backgroundcolor: '#FFFFFF',
                bcid: barcode.format,
                text: parsefncMessage(barcode.message),
                textxalign: 'center',
                textyalign: 'below',
                parsefnc: true,
              }}
            />
          </View>
          {barcode.altText ? (
            <Text
              className="size-sm mt-sm"
              style={{ color: colors.labelColor }}
            >
              {barcode.altText}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export default BoardingPass;
