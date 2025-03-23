import airports from '@/constants/airports.json';
import type { AirportData, AirlineData, Flight } from '@/types';
import { deleteSetting, getSetting, setSetting, settings } from '@/constants/settings';
import { makeCheckInLink, stopBackgroundTask } from '@/helpers/common';
import { getActualFlights, archiveFlight, updateFlight, getAirlines } from '@/helpers/sqlite';
import * as Notifications from '@/helpers/notifications';
import t from '@/helpers/localization';
import { DateTime } from 'luxon';
import { getCalendars } from 'expo-localization';
import { getFlightData } from '@/helpers/flights';
import emitter from '@/helpers/emitter';


export const flightsCheckTask = async () => {
  const flights = await getActualFlights(settings.FLIGHTS_LIMIT);
  if (flights.length !== 0) {
    await updateFlightsState(flights, new Date(), false);
  } else {
    stopBackgroundTask();
  }
};

export const getAirportData = (code: string, locale: string = 'en'): AirportData | undefined => {
  const a = airports.find(x => x.iata_code === code) as any;
  if (!a) {
    return undefined;
  }
  const {
    airport_latitude, airport_longitude, airport_name, country_code, iata_code, municipality_latitude, municipality_longitude, municipality_name,
  } = { ...a };
  const result: AirportData = {
    airport_latitude, airport_longitude, airport_name, country_code, iata_code, municipality_latitude, municipality_longitude, municipality_name,
  };
  locale = locale.split('-')[0].toLowerCase();
  if (locale !== 'en') {
    result.municipality_name = a[`municipality_name_${locale}`] ?? result.municipality_name;
    result.airport_name = a[`airport_name_${locale}`] ?? result.airport_name;
  }
  return result;
}

let airlines: AirlineData[] = [];
export const loadAirlines = async () => {
  airlines = await getAirlines();
};

export const getAirlinesData = (): AirlineData[] => {
  return airlines;
}

export const getAirlineData = (code: string): AirlineData | undefined => {
  return airlines.find(x => x.airlineCode === code);
}

export const airlineLogoUri = (airline: string, plainUri: boolean = false) => {
  const uri = `https://images.kiwi.com/airlines/64x64/${airline}.png`;
  return plainUri ? uri : { uri };
}

export const fetchActualFlights = async (date: Date, forceRefresh: boolean = false): Promise<Flight[]> => {
  let flights = await getActualFlights(settings.FLIGHTS_LIMIT);
  flights = await updateFlightsState(flights, date, forceRefresh);
  return flights;
}

async function updateFlightsState(flights: Flight[], date: Date, forceRefresh: boolean = false): Promise<Flight[]> {

  const timeSpan = (hours: number): string => {
    if (hours >= 23 && hours < 24) return '24h';
    if (hours >= 1.9 && hours <= 3 && hours === Math.floor(hours)) return '3h';
    if (hours >= 0.75 && hours <= 1.5 && (Math.ceil(hours * 60) % 5 === 0 || forceRefresh)) return '90m';
    if (hours >= 0.25 && hours < 0.75 && (Math.ceil(hours * 60) % 3 === 0) || forceRefresh) return 'last';
    return '';
  }
  const result: Flight[] = [];
  for (const f of flights) {
    let isFlightUpdated = false;
    const flight = Object.assign({}, f);
    if (!flight.info) flight.info = {};
    const flightNotificationsState = JSON.parse(getSetting(`flight-notifications-${flight.flightId}`, '{}'));

    const tz = getCalendars()[0]?.timeZone || 'UTC';
    const isDifferentTimezone =  DateTime.now().setZone(tz).toFormat('ZZ') !== flight.endDatetime.substring(19);
    flight.isDifferentTimezone = isDifferentTimezone;

    const startDatetime = new Date(flight.actualStartDatetime ?? flight.startDatetime);
    const hours = (startDatetime.valueOf() - date.valueOf()) / 3600000;
    const minutes = Math.ceil(hours * 60);

    let flightData: Flight | null = null;
    if (flight.recordType === 1) {
      const ts = timeSpan(hours);
      if (ts !== '' && ((flightNotificationsState[ts] ?? -1) !== minutes || forceRefresh)) {
        flightData = await getFlightData(flight.airline, flight.flightNumber, startDatetime);
        if (!!flightData) {
          const messages = [];
          if (!!flightData.status && flight.status !== flightData.status) {
            if (flight.status === 'en_route') {
              if (flightData.status === 'arrived') {
                flight.status = flightData.status;
                isFlightUpdated = true;
              }
            } else {
              messages.push(t('notifications.changed_status', { status: t(`flights.statuses.${flightData.status}`) }));
              flight.status = flightData.status;
              isFlightUpdated = true;
            }
          }

          if (!!flightData.actualStartDatetime && flight.actualStartDatetime !== flightData.actualStartDatetime) {
            messages.push(t('notifications.changed_start_datetime', { time: flightData.actualStartDatetime.substring(11, 16) }));
            flight.actualStartDatetime = flightData.actualStartDatetime;
            isFlightUpdated = true;
          }
          if (!!flightData.departureTerminal && flight.departureTerminal !== flightData.departureTerminal) {
            messages.push(t('notifications.changed_departure_terminal', { terminal: flightData.departureTerminal }));
            flight.departureTerminal = flightData.departureTerminal;
            isFlightUpdated = true;
          }
          if (!!flightData.departureCheckInDesk && flight.departureCheckInDesk !== flightData.departureCheckInDesk) {
            messages.push(t('notifications.changed_departure_check_in_desk', { desk: flightData.departureCheckInDesk }));
            flight.departureCheckInDesk = flightData.departureCheckInDesk;
            isFlightUpdated = true;
          }
          if (!!flightData.departureGate && flight.departureGate !== flightData.departureGate) {
            messages.push(t('notifications.changed_departure_gate', { gate: flightData.departureGate }));
            flight.departureGate = flightData.departureGate;
            isFlightUpdated = true;
          }

          if (!!flightData.actualEndDatetime && flight.actualEndDatetime !== flightData.actualEndDatetime) {
            messages.push(t('notifications.changed_end_datetime', { time: flightData.actualEndDatetime.substring(11, 16) }));
            flight.actualEndDatetime = flightData.actualEndDatetime;
            isFlightUpdated = true;
          }
          if (!!flightData.arrivalTerminal && flight.arrivalTerminal !== flightData.arrivalTerminal) {
            messages.push(t('notifications.changed_arrival_terminal', { terminal: flightData.arrivalTerminal }));
            flight.arrivalTerminal = flightData.arrivalTerminal;
            isFlightUpdated = true;
          }
          if (!!flightData.baggageBelt && flight.baggageBelt !== flightData.baggageBelt) {
            messages.push(t('notifications.changed_baggage_belt', { belt: flightData.baggageBelt }));
            flight.baggageBelt = flightData.baggageBelt;
            isFlightUpdated = true;
          }
          flight.distance = flightData.distance;
          if (messages.length > 0 && minutes > 0) {
            (minutes < 60 ? Notifications.showUrgentNotification : Notifications.showFlightNotification)(
              `${t('flights.flight')} ${flight.airline} ${flight.flightNumber}`,
              messages.join('\n'),
              { url: `/flights/actual?flightId=${flight.flightId}` }
            );
          }
        }
        flightNotificationsState[ts] = minutes;
      }
    }

    const endDatetime = new Date(flight.actualEndDatetime ?? flight.endDatetime);
    const arrivalMinutes = Math.ceil((date.valueOf() - endDatetime.valueOf()) / 60000);

    flight.info.state = '';
    flight.info.stateTime = null as number | null;
    if (hours < 3 && hours > 1 && !flight.seatNumber) {
      if (!['checkin', 'boarding'].includes(flight.status)) {
        flight.info.state = 'checkin_start';
        flight.info.stateTime = minutes - 120;
      }
    }
    if (((flight.status === 'checkin') || (hours < 2 && minutes > 40)) && !flight.seatNumber) {
      flight.info.state = 'checkin_end';
      flight.info.stateTime = minutes - 40;
    }
    if (minutes > 40 && !!flight.seatNumber) {
      flight.info.state = 'boarding_start';
      flight.info.stateTime = minutes - 40;
    }
    if (flight.status === 'boarding' || minutes <= 40) {
      if (minutes > 25) {
        flight.info.state = 'boarding_end';
        flight.info.stateTime = minutes - 25;
      } else {
        flight.info.state = 'lastcall';
        flight.info.stateTime = null;
      }
    }
    if (flight.status === 'gateclosed') {
      flight.info.state = 'gateclosed';
      flight.info.stateTime = null;
    }
    if (minutes <= 20) {
      flight.info.state = 'flight_start';
      flight.info.stateTime = minutes;
    }

    if (minutes <= 0 && !['en_route', 'diverted', 'canceled'].includes(flight.status)) {
      flight.status = 'en_route';
      isFlightUpdated = true;
    }

    if (minutes <= 0 && arrivalMinutes < 0) {
      flight.info.state = 'flight_end';
      flight.info.stateTime = -arrivalMinutes;
    }

    if (hours <= 3 && hours > 2.9 && !flightNotificationsState.beforeFlight3h) {
      await Notifications.showFlightNotification(
        `${t('flights.flight')} ${flight.airline} ${flight.flightNumber}`,
        t('notifications.before_flight_3h'),
        { url: `/flights/actual?flightId=${flight.flightId}` }
      );
      flightNotificationsState.beforeFlight3h = true;
    }
    if (flight.checkInTime && flight.checkInTime !== 0) {
      flight.info.onlineCheckInOpen = false;
      if (hours < flight.checkInTime && hours > 1) {
        flight.info.onlineCheckInOpen = true;
        if (flight.checkInLink && flight.checkInLink.length > 0) {
          flight.info.onlineCheckInLink = makeCheckInLink(
            flight.checkInLink, startDatetime.toISOString().split('T')[0], flight.departureAirport,
            flight.pnr ?? '', `${flight.airline}${flight.flightNumber}`,
          );
        }
        if (!flightNotificationsState.onlineCheckInOpen) {
          await Notifications.showFlightNotification(
            `${t('flights.flight')} ${flight.airline} ${flight.flightNumber}`,
            t('notifications.online_check_in_open'),
            { url: `/flights/actual?flightId=${flight.flightId}` }
          );
          flightNotificationsState.onlineCheckInOpen = true;
        }
      }
    }

    if (arrivalMinutes < 30 && arrivalMinutes >= 0 && (arrivalMinutes % 5 === 0 || forceRefresh) && !flight.baggageBelt) {
      const flightData = await getFlightData(flight.airline, flight.flightNumber, startDatetime);
      if (!!flightData && !!flightData.baggageBelt && flight.baggageBelt !== flightData.baggageBelt) {
        Notifications.showFlightNotification(
          `${t('flights.flight')} ${flight.airline} ${flight.flightNumber}`,
          t('notifications.changed_baggage_belt', { belt: flightData.baggageBelt }),
          { url: `/flights/actual?flightId=${flight.flightId}` }
        )
        flightNotificationsState.baggageBelt = true;
        flight.baggageBelt = flightData.baggageBelt;
        isFlightUpdated = true;
      }
    }
    if (arrivalMinutes >= 0 && !['arrived', 'diverted', 'canceled'].includes(flight.status)) {
      flight.status = 'arrived';
      isFlightUpdated = true;
    }

    setSetting(`flight-notifications-${flight.flightId}`, JSON.stringify(flightNotificationsState));

    if (isFlightUpdated) {
      await updateFlight(flight);
    }
    if (arrivalMinutes >= 60) {
      await setFlightArchiveState(flight.flightId, 1);
      flight.isArchived = true;
      emitter.emit('updatePastFlights', false);
    } else {
      result.push(flight);
    }
  }
  return result;
}

export async function setFlightArchiveState(flightId: number | undefined, state: number) {
  if (!flightId) return;
  await archiveFlight(flightId, state);
  if (state === 1) {
    deleteSetting(`flight-notifications-${flightId}`);
  }
}
