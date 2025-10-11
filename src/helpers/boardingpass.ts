import { PixelRatio } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { unzipSync } from 'fflate';
import { Buffer } from 'buffer';
import { decode, type BarcodedBoardingPass as BCBPData } from 'bcbp';
import type { PKPassAsset, PKPassData, BCBPFormat } from '@/types';
import { getAirportData, airlineLogoUri } from '@/helpers/airdata';
import { scanFromURLAsync } from 'expo-camera';
import { fetch } from '@/helpers/common';

export { type BarcodedBoardingPass as BCBPData } from 'bcbp';

export function getColor(color: string): string | null {
  if (!color) return null;
  if (color.startsWith('#')) {
    return color.toUpperCase();
  }
  if (color.startsWith('rgb')) {
    const rgb = color.match(/\d+/g);
    if (rgb) {
      const r = parseInt(rgb[0]).toString(16).padStart(2, '0');
      const g = parseInt(rgb[1]).toString(16).padStart(2, '0');
      const b = parseInt(rgb[2]).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`.toUpperCase();
    }
  }
  return null;
}

export async function loadPKPass(uri: string): Promise<PKPassData | null> {
  const loadAsset = async (
    filename: string,
    ratio: number,
  ): Promise<PKPassAsset | undefined> => {
    ratio = Math.floor(ratio);
    let base64Content = null;
    while (ratio >= 1) {
      let filepath =
        ratio > 1
          ? `${unzipDir}${filename}@${ratio}x.png`
          : `${unzipDir}${filename}.png`;
      let fileInfo = await FileSystem.getInfoAsync(filepath);
      if (!fileInfo.exists) {
        filepath =
          ratio > 1
            ? `${unzipDir}en.lproj/${filename}@${ratio}x.png`
            : `${unzipDir}en.lproj/${filename}.png`;
        fileInfo = await FileSystem.getInfoAsync(filepath);
        if (!fileInfo.exists) {
          ratio--;
          continue;
        }
      }
      try {
        base64Content = await FileSystem.readAsStringAsync(filepath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        break;
      } catch (error) {
        console.error('Error reading file:', error);
      }
      ratio--;
    }
    if (!base64Content) {
      return undefined;
    }
    return { image: `data:image/png;base64,${base64Content}`, ratio };
  };

  const unzipDir = FileSystem.cacheDirectory + 'pkpass/';

  const dirInfo = await FileSystem.getInfoAsync(unzipDir);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(unzipDir);
  }
  await FileSystem.makeDirectoryAsync(unzipDir);

  const zipFileBase64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zipArray = new Uint8Array(Buffer.from(zipFileBase64, 'base64'));
  try {
    const unzippedFiles = unzipSync(zipArray);
    for (let [fileName, fileData] of Object.entries(unzippedFiles)) {
      if (fileName.indexOf('/') !== -1) {
        const parts = fileName.split('/');
        let dir = unzipDir;
        for (let i = 0; i < parts.length - 1; i++) {
          dir += parts[i] + '/';
          const dirInfo = await FileSystem.getInfoAsync(dir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
          }
        }
        fileName = parts[parts.length - 1];
      }
      const filePath = unzipDir + fileName;
      const base64Content = Buffer.from(fileData).toString('base64');
      await FileSystem.writeAsStringAsync(filePath, base64Content, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  } catch (error) {
    console.error('Error unzipping file:', error);
    return null;
  }
  const pass = JSON.parse(
    await FileSystem.readAsStringAsync(unzipDir + 'pass.json', {
      encoding: FileSystem.EncodingType.UTF8,
    }),
  );
  if (
    pass.formatVersion !== 1 ||
    pass.boardingPass.transitType !== 'PKTransitTypeAir'
  ) {
    console.error(
      `Unsupported pass format version: ${pass.formatVersion} or transitType: ${pass.boardingPass.transitType}`,
    );
    return null;
  }

  const ratio = PixelRatio.get();

  const result: PKPassData = {
    airline: pass.organizationName,
    barcode:
      pass.barcode ??
      (pass.barcodes && pass.barcodes.length > 0 ? pass.barcodes[0] : ''),
    boardingPass: pass.boardingPass,
    colors: {
      backgroundColor: getColor(pass.backgroundColor) ?? '#ffffff',
      labelColor: getColor(pass.labelColor) ?? '#000000',
      foregroundColor: getColor(pass.foregroundColor) ?? '#000000',
    },
    images: {
      logo: await loadAsset('logo', ratio),
      footer: await loadAsset('footer', ratio),
      icon: await loadAsset('icon', ratio),
    },
  };
  return result;
}

export const parsefncMessage = (message: string): string => {
  return message
    .split('')
    .map((c) => {
      if (c === '^') {
        return '^^';
      } else if (c.charCodeAt(0) > 255) {
        return `^ECI${c.charCodeAt(0).toString(10).padStart(6, '0')}`;
      }
      return c;
    })
    .join('');
};

export function decodeBCBP(bcbp: string): BCBPData | null {
  try {
    return decode(bcbp) ?? null;
  } catch (error) {
    console.error('Error decoding BCBP:', error);
    return null;
  }
}

export async function createPKPass(
  bcbp: string,
  format: BCBPFormat = 'PKBarcodeFormatQR',
): Promise<PKPassData | null> {
  const bpData = decodeBCBP(bcbp);
  if (!bpData || !bpData.data || !bpData.data.legs || !bpData.data.legs[0]) {
    return null;
  }
  try {
    const leg = bpData.data.legs[0];
    const airline = (leg.operatingCarrierDesignator as string).trim();

    const departureAirportData = getAirportData(leg.departureAirport as string);
    const arrivalAirportData = getAirportData(leg.arrivalAirport as string);
    const primaryFields = [
      {
        label: departureAirportData?.airport_name,
        value: departureAirportData?.iata_code ?? '',
        key: 'departureAirportCode',
      },
      {
        label: arrivalAirportData?.airport_name,
        value: arrivalAirportData?.iata_code ?? '',
        key: 'arrivalAirportCode',
      },
    ];
    const auxiliaryFields = [
      {
        label: 'Passenger',
        value: bpData.data.passengerName?.trim() ?? '',
        key: 'passenger',
      },
      {
        label: 'Seat',
        value: (leg.seatNumber ?? '').replace(/^0+/, ''),
        key: 'seat',
      },
      { label: 'Gate', value: '—', key: 'gate' },
    ];
    if (leg.fastTrack !== undefined && leg.fastTrack) {
      auxiliaryFields.push({
        label: 'Fast track',
        value: 'Yes',
        key: 'fastTrack',
      });
    }
    const headerFields = [
      {
        label: 'Flight number',
        value: `${leg.operatingCarrierDesignator?.trim()} ${leg.flightNumber?.replace(/^0+/, '')}`,
        key: 'flightNumber',
      },
    ];
    const date = (leg.flightDate ?? new Date()).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
    });
    const secondaryFields = [{ label: 'Date', value: date, key: 'date' }];
    if (!!leg.compartmentCode && leg.compartmentCode !== '') {
      secondaryFields.push({
        label: 'Cabin',
        value: leg.compartmentCode,
        key: 'cabinType',
      });
    }
    if (!!leg.selecteeIndicator && leg.selecteeIndicator !== '') {
      secondaryFields.push({
        label: 'Vetting status',
        value: leg.selecteeIndicator,
        key: 'vettingStatus',
      });
    }
    secondaryFields.push({
      label: 'Sequence No',
      value: leg.checkInSequenceNumber ?? '',
      key: 'seqNo',
    });

    let image: any = null;
    try {
      image = await fetch(airlineLogoUri(airline, true) as string, {
        timeout: 1000,
      });
    } catch (error) {
      return null;
    }
    image =
      image && image.ok && image.status === 200
        ? await image.arrayBuffer()
        : null;
    let logo: PKPassAsset | undefined = undefined;
    if (image) {
      const base64Content = Buffer.from(image).toString('base64');
      logo = { image: `data:image/png;base64,${base64Content}`, ratio: 1 };
    }

    const result: PKPassData = {
      airline,
      barcode: {
        altText: '',
        format: format,
        message: bcbp,
        messageEncoding: 'UTF-8',
      },
      boardingPass: {
        auxiliaryFields,
        headerFields,
        primaryFields,
        secondaryFields,
      },
      colors: {
        backgroundColor: '#ffffff',
        labelColor: '#000000',
        foregroundColor: '#000000',
      },
      images: {
        logo,
      },
    };
    return result;
  } catch (error) {
    console.error('Error creating PKPass:', error);
    return null;
  }
}

const BCBPFormatMap: { [key: string]: BCBPFormat } = {
  4096: 'PKBarcodeFormatAztec',
  16: 'PKBarcodeFormatDataMatrix',
  2048: 'PKBarcodeFormatPDF417',
  256: 'PKBarcodeFormatQR',
};

export async function scanBarcode(
  uri: string,
): Promise<{ bcbp: string | null; format: BCBPFormat | null }> {
  const scanResult = await scanFromURLAsync(uri, [
    'aztec',
    'datamatrix',
    'qr',
    'pdf417',
  ]);
  if (!scanResult || scanResult.length === 0) {
    return { bcbp: null, format: null };
  }

  return {
    bcbp: scanResult[0].raw ?? scanResult[0].data,
    format: BCBPFormatMap[scanResult[0].type as keyof typeof BCBPFormatMap],
  };
}
