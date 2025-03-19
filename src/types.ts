import React from 'react';
import { SkPath } from '@shopify/react-native-skia';
import { Point } from '@/helpers/algs';


export interface AirlineData {
  airlineId: number;
  airlineCode: string;
  airlineName: string;
  checkInLink: string;
  checkInTime: string;
};

export interface AirportData {
  airport_latitude: number;
  airport_longitude: number;
  airport_name: string;
  country_code: string;
  iata_code: string;
  municipality_latitude: number;
  municipality_longitude: number;
  municipality_name: string;
};

export interface Achievement {
  arrivalAirport: string;
  date: string;
  departureAirport: string;
  id: string;
  name: string;
  svg: Array<SkPath>;
};

export interface AchievementData {
  name: string;
  flightDate: string;
  departureAirport: string;
  arrivalAirport: string;
};

export type BCBPFormat = 'PKBarcodeFormatAztec' | 'PKBarcodeFormatDataMatrix' | 'PKBarcodeFormatPDF417' | 'PKBarcodeFormatQR';

export interface ConfirmationDialogSettings {
  closeButton: string;
  confirmButton?: string;
  description: string;
  title: string;
  showOnlyCloseButton: boolean;
  onConfirm?: () => void;
};

export interface ContextData {
  achievement: Achievement;
  color: string;
  hull: Point[];
};

export interface DepartingFlightCardData {
  actualEndDatetime?: number;
  actualStartDatetime?: number;
  airline: string;
  arrivalAirport: string;
  arrivalAirportTimezone: string;
  arrivalTerminal?: string;
  boardingPass?: PKPassData;
  departureAirport: string;
  departureAirportTimezone: string;
  departureCheckInDesk?: string;
  departureGate?: string;
  departureTerminal?: string;
  distance: number;
  endDatetime: number;
  flightId: number;
  flightNumber: string;
  isArchived: boolean;
  isOnlineCheckInOpen?: boolean;
  onlineCheckInLink?: string;
  seatNumber?: string;
  startDatetime: number;
  state?: FlightState;
  stateTime?: number;
  status: FlightStatus;
};

export interface Flight {
  actualEndDatetime?: string;
  actualStartDatetime?: string;
  aircraftType?: string;
  aircraftRegNumber?: string;
  airlineId?: number;
  airline: string;
  airlineName?: string;
  arrivalAirport: string;
  arrivalAirportTimezone: string;
  arrivalCountry: string;
  arrivalTerminal?: string;
  baggageBelt?: string;
  bcbp?: any;
  bcbpData?: string;
  bcbpFormat?: BCBPFormat;
  bcbpPkpass?: PKPassData | string;
  checkInLink?: string;
  checkInTime?: number;
  departureAirport: string;
  departureAirportTimezone: string;
  departureCheckInDesk?: string;
  departureCountry: string;
  departureGate?: string;
  departureTerminal?: string;
  distance: number;
  endDatetime: string;
  extra: any;
  flightId?: number;
  flightNumber: string;
  info: any;
  isArchived: boolean;
  isDifferentTimezone?: boolean;
  notes?: string;
  passengerName?: string;
  pnr?: string;
  recordType: number; // 0 - imported, 1 - added by API, 2 - added manually
  seatNumber?: string;
  startDatetime: string;
  status: FlightStatus;
};

export type FlightState = 'gateclosed' | 'boarding_start' | 'boarding' | 'boarding_end' | 'checkin_end' | 'checkin' | 'flight_end' | 'flight_start' | 'lastcall';

export const FlightStatusValues = ['scheduled', 'checkin', 'on_time', 'gateclosed', 'boarding', 'delayed', 'canceled', 'departed', 'en_route', 'arrived', 'diverted', 'unknown'] as const;
export type FlightStatus = typeof FlightStatusValues[number];

export interface FlightCardData {
  actualEndDatetime?: number;
  actualStartDatetime?: number;
  airline: string;
  arrivalAirport: string;
  arrivalAirportTimezone: string;
  departureAirport: string;
  departureAirportTimezone: string;
  distance: number;
  endDatetime: number;
  flightId: number;
  flightNumber: string;
  isArchived: boolean;
  isOnlineCheckInOpen?: boolean;
  onlineCheckInLink?: string;
  seatNumber?: string;
  startDatetime: number;
  state?: FlightState;
  stateTime?: number;
  status: FlightStatus;
};

export interface FlightsFilter {
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  airports: Array<string>;
};

export interface LandedFlightCardData {
  actualEndDatetime: number;
  actualStartDatetime: number;
  airline: string;
  arrivalAirport: string;
  arrivalAirportTimezone: string;
  arrivalTerminal: string;
  baggageBelt: string;
  departureAirport: string;
  departureAirportTimezone: string;
  departureTerminal: string;
  distance: number;
  endDatetime: number;
  flightId: number;
  flightNumber: string;
  isArchived: boolean;
  isDifferentTimezone: boolean;
  startDatetime: number;
};

export interface PKPassAsset {
  image: string;
  ratio: number;
};

export interface PKPassData {
  airline: string;
  barcode: {
    altText: string;
    format: string;
    message: string;
    messageEncoding: string;
  };
  boardingPass: Partial<{
    auxiliaryFields: Array<{ label?: string; key: string; value: string }>;
    backFields: Array<{ label?: string; key: string; value: string }>;
    headerFields: Array<{ label?: string; key: string; value: string }>;
    primaryFields: Array<{ label?: string; key: string; value: string }>;
    secondaryFields: Array<{ label?: string; key: string; value: string }>;
    transitType: string;
  }>;
  colors: {
    backgroundColor: string;
    foregroundColor: string;
    labelColor: string;
  },
  images: {
    footer?: PKPassAsset;
    icon?: PKPassAsset;
    logo?: PKPassAsset;
  },
};

export interface StatsData {
  [key: string]: {
    aircrafts: number;
    airlines: number;
    airports: number;
    avgDelay: number;
    avgDistance: number;
    avgDuration: number;
    countries: number;
    countryCodes: string;
    distance: number;
    domesticFlights: number;
    duration: number;
    flights: number;
    internationalFlights: number;
    longHaulFlights: number;
  };
};

export interface TabData {
  icon: string;
  route: string;
  title: string;
};

export interface ThemeData {
  colors: {
    [key: string]: string;
  };
  textColors: {
    [key: string]: string;
  };
  font: {
    family: string;
    sizes: {
      [key: string]: number;
    };
    weights: {
      [key: string]: string;
    };
  };
  elevated: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  radius: {
    [key: string]: number;
  };
  spacing: {
    [key: string]: number;
  };
};

export interface WeatherData {
  code: number;
  icons: Array<React.JSX.Element>;
  temperature: number;
  temperatureOut: string;
};
