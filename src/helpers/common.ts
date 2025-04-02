import type { ConfirmationDialogSettings, DepartingFlightCardData, Flight, FlightCardData, FlightStatus, LandedFlightCardData } from '@/types';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Alert, Linking, AlertButton, NativeModules } from 'react-native';
import { getSetting, setSetting } from '@/constants/settings';
import emitter from '@/helpers/emitter';


const { AirPlainBgModule } = NativeModules;

export function camelCase(obj: any) {
  const result: any = {};
  for (let d in obj) {
    if (obj.hasOwnProperty(d)) {
      const k: string = d.replace(/(\_\w)/g, function(k) {
        return k[1].toUpperCase();
      });
      result[k] = obj[d];
    }
  }
  return result;
}

export function snakeCase(obj: any) {
  const result: any = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[newKey] = obj[key];
    }
  }
  return result;
}

export function flightToFlightData(flight: Flight): FlightCardData {
  const data = {
    actualEndDatetime: flight.actualEndDatetime ? new Date(flight.actualEndDatetime).getTime() / 1000 : undefined,
    actualStartDatetime: flight.actualStartDatetime ? new Date(flight.actualStartDatetime).getTime() / 1000 : undefined,
    airline: flight.airline,
    arrivalAirport: flight.arrivalAirport,
    arrivalAirportTimezone: flight.arrivalAirportTimezone,
    departureAirport: flight.departureAirport,
    departureAirportTimezone: flight.departureAirportTimezone,
    distance: flight.distance,
    endDatetime:  new Date(flight.endDatetime).getTime() / 1000,
    flightId: flight.flightId,
    flightNumber: flight.flightNumber,
    isArchived: flight.isArchived,
    isOnlineCheckInOpen: !!flight.info?.onlineCheckInOpen,
    onlineCheckInLink: flight.info?.onlineCheckInLink,
    seatNumber: flight.seatNumber,
    startDatetime: new Date(flight.startDatetime).getTime() / 1000,
    status: flight.status as FlightStatus,
    state: flight.info?.state,
    stateTime: flight.info?.stateTime ?? undefined,
  } as FlightCardData;
  return data;
}

export function flightToDepartingFlightData(flight: Flight): DepartingFlightCardData {
  const data = {
    actualEndDatetime: flight.actualEndDatetime ? new Date(flight.actualEndDatetime).getTime() / 1000 : undefined,
    actualStartDatetime: flight.actualStartDatetime ? new Date(flight.actualStartDatetime).getTime() / 1000 : undefined,
    airline: flight.airline,
    arrivalAirport: flight.arrivalAirport,
    arrivalAirportTimezone: flight.arrivalAirportTimezone,
    arrivalTerminal: flight.arrivalTerminal,
    boardingPass: flight.bcbpPkpass,
    departureAirport: flight.departureAirport,
    departureAirportTimezone: flight.departureAirportTimezone,
    departureCheckInDesk: flight.departureCheckInDesk,
    departureGate: flight.departureGate,
    departureTerminal: flight.departureTerminal,
    distance: flight.distance,
    endDatetime:  new Date(flight.endDatetime).getTime() / 1000,
    flightId: flight.flightId,
    flightNumber: flight.flightNumber,
    isArchived: flight.isArchived,
    isOnlineCheckInOpen: !!flight.info?.onlineCheckInOpen,
    onlineCheckInLink: flight.info?.onlineCheckInLink,
    seatNumber: flight.seatNumber,
    startDatetime: new Date(flight.startDatetime).getTime() / 1000,
    state: flight.info.state,
    stateTime: flight.info.stateTime ?? undefined,
    status: flight.status as FlightStatus,
  } as DepartingFlightCardData;
  return data;
}

export function flightToLandedFlightData(flight: Flight): LandedFlightCardData {
  const data = {
    actualEndDatetime: flight.actualEndDatetime ? new Date(flight.actualEndDatetime).getTime() / 1000 : undefined,
    actualStartDatetime: flight.actualStartDatetime ? new Date(flight.actualStartDatetime).getTime() / 1000 : undefined,
    airline: flight.airline,
    arrivalAirport: flight.arrivalAirport,
    arrivalAirportTimezone: flight.arrivalAirportTimezone,
    arrivalTerminal: flight.arrivalTerminal,
    baggageBelt: flight.baggageBelt,
    departureAirport: flight.departureAirport,
    departureAirportTimezone: flight.departureAirportTimezone,
    departureCheckInDesk: flight.departureCheckInDesk,
    departureGate: flight.departureGate,
    departureTerminal: flight.departureTerminal,
    distance: flight.distance,
    endDatetime:  new Date(flight.endDatetime).getTime() / 1000,
    flightId: flight.flightId,
    flightNumber: flight.flightNumber,
    isArchived: flight.isArchived,
    isDifferentTimezone: flight.isDifferentTimezone,
    startDatetime: new Date(flight.startDatetime).getTime() / 1000,
    status: flight.status as FlightStatus,
  } as LandedFlightCardData;
  return data;
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRadians = (angle: number) => angle * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function readFileToString(file: any): Promise<string | null> {
  const [{ localUri }] = await Asset.loadAsync(file);
  return localUri ? await FileSystem.readAsStringAsync(localUri) : null;
}

export function openUrl(url: string) {
  Linking.openURL(url);
}

export function makeCheckInLink(checkInLink: string, date: string, departureAirport: string, pnr: string, flightNumber: string): string {
  const fields = [
    { field: 'DEP_DATE_EU', value: date },
    { field: 'IATA_DEP', value: departureAirport },
    { field: 'FIRST', value: getSetting('firstname', '') },
    { field: 'LAST', value: getSetting('surname', '') },
    { field: 'PNR', value: pnr ?? '' },
    { field: 'FLT_NO', value: flightNumber },
  ];
  let link = checkInLink;
  for (const field of fields) {
    link = link.replace(new RegExp(`{${field.field}}`, 'g'), field.value);
  }
  return link;
}

export function refreshFlights(refreshing: boolean) {
  emitter.emit('updateActualFlights', refreshing);
  emitter.emit('updatePastFlights', refreshing);
}

export const showConfirmation = (confirmationDialog: ConfirmationDialogSettings) => {
  const buttons: Array<AlertButton> = [
    {
      text: confirmationDialog.closeButton,
      style: 'cancel',
    },
  ];
  if (!confirmationDialog.showOnlyCloseButton) {
    buttons.push(
      {
        text: confirmationDialog.confirmButton,
        style: 'default',
        onPress: () => confirmationDialog.onConfirm?.(),
      }
    );
  }
  Alert.alert(
    confirmationDialog.title,
    confirmationDialog.description,
    buttons,
    { cancelable: true }
  );
}

export const startBackgroundTask = () => {
  if (getSetting('backgroundTaskStarted', 'false') === 'false') {
    AirPlainBgModule.startBackgroundTask();
    setSetting('backgroundTaskStarted', 'true');
  }
}

export const stopBackgroundTask = () => {
  if (getSetting('backgroundTaskStarted', 'false') === 'true') {
    AirPlainBgModule.stopBackgroundTask();
    setSetting('backgroundTaskStarted', 'false');
  }
}

export const fetch = async (
  url: string,
  { timeout = 5000, ...fetchOptions }: RequestInit & { timeout?: number } = {}
) => {
  const controller = new AbortController();

  const abort = setTimeout(() => {
    controller.abort();
  }, timeout);

  const response = await globalThis.fetch(url, {
    ...fetchOptions,
    signal: controller.signal,
  });

  clearTimeout(abort);
  return response;
}
