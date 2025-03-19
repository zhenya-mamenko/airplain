import React from 'react';
import { SvgLightWind, SvgModerateWind, SvgHeaveWind } from '@/constants/svg/weather';
import { weatherIcons } from '@/constants/weather';
import type { WeatherData } from '@/types';
import { WEATHER_API_URL, settings } from '@/constants/settings';


export const parseWeather = (data: any, color: string, iconSize: number = 20): WeatherData | null => {
  if (!data) {
    return null;
  }
  const icons: Array<React.JSX.Element> = [];
  const iconsProps = {
    color,
    style: { width: iconSize, height: iconSize, marginLeft: 4 },
  }

  const weatherIcon = ((data.is_day == 0 ? weatherIcons.night : weatherIcons.day) as any)[data.condition.code.toString()];
  if (weatherIcon) {
    if (Array.isArray(weatherIcon)) {
      let i = 0;
      for (const icon of weatherIcon) {
        icons.push(React.createElement(icon, { ...iconsProps, key: `weather-icon-${data.condition.code}-${++i}` }));
      }
    } else {
      icons.push(React.createElement(weatherIcon, { ...iconsProps, key: `weather-icon-${data.condition.code}` }));
    }
  }

  if (data.wind_kph >= 40) {
    icons.push(React.createElement(SvgHeaveWind, { ...iconsProps, key: 'heavy-wind' }));
  } else if (data.wind_kph >= 20) {
    icons.push(React.createElement(SvgModerateWind, { ...iconsProps, key: 'moderate-wind' }));
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
    code: data.condition.code,
  };
  return weatherData;
}

export const loadWeather = async (latitude: number, longitude: number): Promise<any | null> => {
  const WEATHER_API_ENDPOINT = settings.WEATHER_API_KEY ? `${WEATHER_API_URL}/current.json?key=${settings.WEATHER_API_KEY}&aqi=no&q=` : null
  if (!WEATHER_API_ENDPOINT || WEATHER_API_ENDPOINT.length === 0 || !latitude || !longitude) {
    return null;
  }
  const url = `${WEATHER_API_ENDPOINT}${latitude},${longitude}`;
  const response = await fetch(url);
  if (response.ok) {
    return await response.json();
  }
  return null;
}
