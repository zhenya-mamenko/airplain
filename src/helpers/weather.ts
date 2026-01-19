import React from 'react';

import { WEATHER_API_URL, settings } from '@/constants/settings';
import { SvgHeaveWind, SvgLightWind, SvgModerateWind } from '@/constants/svg/weather';
import { weatherIcons } from '@/constants/weather';
import { celciusToFahrenheit, fetch } from '@/helpers/common';
import type { WeatherData } from '@/types';

export const parseWeather = (data: any, color: string, iconSize: number = 20): WeatherData | null => {
  if (!data) {
    return null;
  }
  const code = data.condition.code;
  const icons: Array<React.JSX.Element> = [];
  const iconsProps = {
    color,
    style: { width: iconSize, height: iconSize, marginLeft: 4 },
  };

  const weatherIcon = ((data.is_day == 0 ? weatherIcons.night : weatherIcons.day) as any)[`${code}`];
  if (weatherIcon) {
    if (Array.isArray(weatherIcon)) {
      let i = 0;
      for (const icon of weatherIcon) {
        icons.push(
          React.createElement(icon, {
            ...iconsProps,
            key: `weather-icon-${code}-${++i}`,
          }),
        );
      }
    } else {
      icons.push(
        React.createElement(weatherIcon, {
          ...iconsProps,
          key: `weather-icon-${code}`,
        }),
      );
    }
  }

  if (data.wind_kph >= 40) {
    icons.push(React.createElement(SvgHeaveWind, { ...iconsProps, key: 'heavy-wind' }));
  } else if (data.wind_kph >= 20) {
    icons.push(
      React.createElement(SvgModerateWind, {
        ...iconsProps,
        key: 'moderate-wind',
      }),
    );
  } else if (data.wind_kph >= 12) {
    icons.push(React.createElement(SvgLightWind, { ...iconsProps, key: 'light-wind' }));
  }

  let temperature: number = Math.round(data[`${settings.TEMPERATURE_TYPE}_${settings.TEMPERATURE_UNITS}`]);
  let temperatureOut: string = '0°';
  if (temperature > 0) {
    temperatureOut = `+${temperature}°`;
  } else if (temperature < 0) {
    temperatureOut = `–${Math.abs(temperature)}°`;
  }

  const weatherData = {
    temperature,
    temperatureOut,
    icons,
    code,
  };
  return weatherData;
};

export const loadWeather = async (latitude: number, longitude: number): Promise<any | null> => {
  const WEATHER_API_ENDPOINT = settings.WEATHER_API_KEY
    ? `${WEATHER_API_URL}/current.json?key=${settings.WEATHER_API_KEY}&aqi=no&q=`
    : null;
  if (!WEATHER_API_ENDPOINT || !latitude || !longitude) {
    return null;
  }
  const url = `${WEATHER_API_ENDPOINT}${latitude},${longitude}`;
  let response = null;
  try {
    response = await fetch(url, { timeout: 3000 });
  } catch {
    return null;
  }
  if (response && response.ok && response.status === 200) {
    const result = await response.json();
    return result?.current || null;
  }
  return null;
};

export const loadForecast = async (
  latitude: number,
  longitude: number,
  date: string,
  hour: number,
): Promise<any | null> => {
  const WEATHER_API_ENDPOINT = settings.WEATHER_API_KEY
    ? `${WEATHER_API_URL}/forecast.json?key=${settings.WEATHER_API_KEY}&days=1&dt=${date}&hour=${hour}&alerts=no&aqi=no&q=`
    : null;
  if (!WEATHER_API_ENDPOINT || !latitude || !longitude || !date || !hour) {
    return null;
  }
  const url = `${WEATHER_API_ENDPOINT}${latitude},${longitude}`;
  let response = null;
  try {
    response = await fetch(url, { timeout: 3000 });
  } catch {
    return null;
  }
  if (response && response.ok && response.status === 200) {
    const result = await response.json();
    const data = result?.forecast?.forecastday?.[0]?.hour?.[0] || null;
    if (!data) return null;
    data['temp_f'] = celciusToFahrenheit(data['temp_c']);
    data['feelslike_f'] = celciusToFahrenheit(data['feelslike_c']);
    data['windchill_f'] = celciusToFahrenheit(data['feelslike_c']);
    return data;
  }
  return null;
};
