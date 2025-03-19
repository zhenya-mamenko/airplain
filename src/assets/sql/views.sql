CREATE VIEW IF NOT EXISTS vw_flights
AS
  SELECT
    flight_id,
    flights.airline_id,
    COALESCE(airlines.airline_code, JSON_EXTRACT(extra, '$.airline'), '') as airline,
    COALESCE(airlines.airline_name, JSON_EXTRACT(extra, '$.airline_name'), '') as airline_name,
    flight_number,
    departure_airport,
    departure_country,
    departure_airport_timezone,
    arrival_airport,
    arrival_country,
    arrival_airport_timezone,
    start_datetime,
    end_datetime,
    distance,
    actual_end_datetime,
    actual_start_datetime,
    departure_terminal,
    departure_check_in_desk,
    departure_gate,
    arrival_terminal,
    baggage_belt,
    IFNULL(aircraft_name, aircraft_type) as aircraft_type,
    aircraft_reg_number,
    status,
    is_archived,
    record_type,
    extra,
    notes,
    airlines.check_in_link,
    airlines.check_in_time
  FROM flights
    LEFT OUTER JOIN airlines USING (airline_id)
    LEFT OUTER JOIN aircraft_types ON flights.aircraft_type = aircraft_types.aircraft_type_code;

CREATE VIEW IF NOT EXISTS vw_passengers
AS
  SELECT
    passenger_id,
    flight_id,
    pnr,
    passenger_name,
    seat_number,
    bcbp,
    JSON_EXTRACT(bcbp, '$.data') as bcbp_data,
    JSON_EXTRACT(bcbp, '$.format') as bcbp_format,
    JSON_EXTRACT(bcbp, '$.pkpass') as bcbp_pkpass
  FROM passengers;

CREATE VIEW IF NOT EXISTS vw_stats
AS
  WITH
    source AS (
      SELECT
        flight_id,
        STRFTIME('%Y', COALESCE(actual_start_datetime, start_datetime)) as year,
        (UNIXEPOCH(COALESCE(actual_end_datetime, end_datetime)) - UNIXEPOCH(COALESCE(actual_start_datetime, start_datetime))) / 60 as duration,
        (UNIXEPOCH(COALESCE(actual_end_datetime, end_datetime)) - UNIXEPOCH(end_datetime)) / 60 as delay,
        IIF(status != 'diverted', distance, 0) as distance,
        aircraft_type,
        airline,
        departure_airport,
        arrival_airport,
        arrival_country,
        departure_country,
        status
      FROM vw_flights
      WHERE is_archived = 1 and status != 'canceled'
    ),
    airports_source AS (
      SELECT DISTINCT
        year,
        departure_airport as airport
      FROM source
      UNION
      SELECT DISTINCT
        year,
        arrival_airport as airport
      FROM source
      WHERE status != 'diverted'
    ),
    airports AS (
      SELECT
        year,
        COUNT(DISTINCT airport) as airports
      FROM airports_source
      GROUP BY year
      UNION ALL
      SELECT DISTINCT
        'all' as year,
        COUNT(DISTINCT airport) as airports
      FROM airports_source
    ),
    countries_source AS (
      SELECT year, country_code, COUNT(DISTINCT flight_id) as cnt
      FROM (
        SELECT
          flight_id,
          year,
          departure_country as country_code
        FROM source
        UNION ALL
        SELECT
          flight_id,
          year,
          arrival_country as country_code
        FROM source
        WHERE status != 'diverted'
      )
      GROUP BY year, country_code
      ORDER BY 1, 3 DESC, 2
    ),
    countries AS (
      SELECT
        year,
        COUNT(country_code) as countries,
        GROUP_CONCAT(country_code, ',') as country_codes
      FROM countries_source
      GROUP BY year
      UNION ALL
      SELECT DISTINCT
        'all' as year,
        COUNT(DISTINCT country_code) as countries,
        GROUP_CONCAT(country_code, ',') as country_codes
      FROM (SELECT DISTINCT country_code FROM countries_source GROUP BY country_code ORDER BY SUM(cnt) DESC, country_code)
    ),
    data AS (
      SELECT
        year,
        SUM(duration) as duration,
        SUM(distance) as distance,
        COUNT(*) as flights,
        SUM(IIF(departure_country = arrival_country, 1, 0)) as domestic_flights,
        SUM(IIF(departure_country = arrival_country, 0, 1)) as international_flights,
        SUM(IIF(duration >= 480, 1, 0)) as long_haul_flights,
        COUNT(DISTINCT aircraft_type) as aircrafts,
        COUNT(DISTINCT airline) as airlines,
        SUM(delay) as delay
      FROM source
      GROUP BY year
      UNION ALL
      SELECT DISTINCT
        'all' as year,
        SUM(duration) as duration,
        SUM(distance) as distance,
        COUNT(*) as flights,
        SUM(IIF(departure_country = arrival_country, 1, 0)) as domestic_flights,
        SUM(IIF(departure_country = arrival_country, 0, 1)) as international_flights,
        SUM(IIF(duration >= 480, 1, 0)) as long_haul_flights,
        COUNT(DISTINCT aircraft_type) as aircrafts,
        COUNT(DISTINCT airline) as airlines,
        SUM(delay) as delay
      FROM source
    )
  SELECT
    year,
    distance,
    duration,
    flights,
    domestic_flights,
    international_flights,
    long_haul_flights,
    aircrafts,
    airlines,
    airports,
    countries,
    country_codes,
    distance / flights as avg_distance,
    duration / flights as avg_duration,
    delay / flights as avg_delay
  FROM data
    INNER JOIN airports USING (year)
    INNER JOIN countries USING (year);

CREATE VIEW IF NOT EXISTS vw_achievements
AS
  WITH
    source AS (
      SELECT
        f.flight_id,
        COALESCE(f.actual_start_datetime, f.start_datetime) as start_datetime,
        COALESCE(f.actual_end_datetime, f.end_datetime) as end_datetime,
        f.distance,
        d.airport_latitude as dep_lat,
        d.airport_longitude as dep_lon,
        d.elevation as dep_el,
        a.airport_latitude as arr_lat,
        a.airport_longitude as arr_lon,
        a.elevation as arr_el,
        departure_airport,
        arrival_airport,
        departure_country,
        arrival_country
      FROM flights f
        INNER JOIN airports d ON d.iata_code = f.departure_airport
        INNER JOIN airports a ON a.iata_code = f.arrival_airport
      WHERE f.is_archived = 1 and f.status != 'canceled'
    ),
    checks AS (
      SELECT
        flight_id,
        STRFTIME('%F', start_datetime) as flight_date,
        IIF(start_datetime > end_datetime, 1, -1) as back_to_future_check,
        IIF(distance < 500, 0, IIF(distance > 10000, 1, -1)) as distance_check,
        IIF(STRFTIME('%H', start_datetime) >= '04' AND STRFTIME('%H', start_datetime) < '06', 0,
          IIF(STRFTIME('%H', start_datetime) > '23' || STRFTIME('%H', start_datetime) < '04', 0, -1)) as time_check,
        IIF(ABS(dep_lat) > 66.5622 OR ABS(arr_lat) > 66.5622, 1, -1) as polar_check,
        IIF(dep_lat * arr_lat < 0, 1, -1) as equator_check,
        IIF(dep_el > 2500 OR arr_el > 2500, 1, -1) as high_altitude_check,
        IIF(ABS(dep_lon - arr_lon) / 15 > 5, 1, -1) as multiple_timezones_check,
        IIF((STRFTIME('%m', start_datetime) = '12' AND STRFTIME('%d', start_datetime) = '31')
          OR (STRFTIME('%m', start_datetime) = '01' AND STRFTIME('%d', start_datetime) = '01'), 1, -1) as new_year_check,
        IIF(STRFTIME('%m', start_datetime) = '05'
          AND (STRFTIME('%d', start_datetime) = '20' OR STRFTIME('%d', start_datetime) = '21'), 1, -1) as summer_solstice_check,
        IIF(STRFTIME('%m', start_datetime) = '11'
          AND (STRFTIME('%d', start_datetime) = '21' OR STRFTIME('%d', start_datetime) = '22'), 1, -1) as winter_solstice_check,
        ((dep_lon + 180) % 360) - 180 as dep_lon,
        ((arr_lon + 180) % 360) - 180 as arr_lon
      FROM source
    ),
    checks2 AS (
      SELECT
        flight_id,
        flight_date,
        IIF(dep_lon * arr_lon < 0 AND ABS(dep_lon - arr_lon) > 180, 1, -1) as cross_dateline_check,
        IIF(dep_lon * arr_lon < 0 AND ABS(dep_lon - arr_lon) <= 180, 1, -1) as cross_hemispheres
      FROM checks
    ),
    airports_source AS (
      SELECT DISTINCT
        flight_id,
        STRFTIME('%F', start_datetime) as flight_date,
        departure_airport as airport_code
      FROM source
      UNION
      SELECT DISTINCT
        flight_id,
        STRFTIME('%F', start_datetime) as flight_date,
        arrival_airport as airport_code
      FROM source
    ),
    countries_source AS (
      SELECT DISTINCT
        flight_id,
        STRFTIME('%F', start_datetime) as flight_date,
        departure_country as country_code
      FROM source
      UNION
      SELECT DISTINCT
        flight_id,
        STRFTIME('%F', start_datetime) as flight_date,
        arrival_country as country_code
      FROM source
    ),
    data AS (
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        country_code as name
      FROM countries_source
      WINDOW w AS (PARTITION BY country_code ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'island' as name
      FROM airports_source
      WHERE airport_code IN ('ANU', 'AXA', 'BGI', 'BZE', 'CUR', 'EIS', 'FDF', 'GCM', 'HAV', 'KIN', 'MBJ', 'NAS', 'POS', 'PLS',
        'PTP', 'PUJ', 'SDQ', 'SJU', 'STI', 'STT', 'STX', 'SXM', 'TAB', 'UVF', 'VQS', 'APW', 'BOB', 'BDA', 'CEB', 'CGK', 'CXI',
        'DPS', 'FUN', 'GUM', 'HIR', 'HKT', 'HNL', 'IPC', 'KIX', 'KLO', 'KOA', 'LBJ', 'LIH', 'LOM', 'MAJ', 'MLE', 'MOZ', 'NAN',
        'NGO', 'NOU', 'OGG', 'OOL', 'TFS', 'PPG', 'PPT', 'RAR', 'ROR', 'SUV', 'SID', 'TBU', 'TRW', 'USM', 'VLI', 'DIE', 'DRW',
        'GAN', 'HAH', 'MRU', 'NOS', 'TER', 'RRG', 'RUN', 'SEZ', 'TLE', 'TMM', 'TNR', 'ZNZ', 'ACE', 'FNC', 'LPA', 'PDL', 'SMA')
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'exotic' as name
      FROM airports_source
      WHERE airport_code IN ('IPC', 'LYR', 'USH', 'LUA', 'GMR', 'TDC', 'SID', 'BWB', 'FUN', 'TRW')
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(STRFTIME('%F', start_datetime)) OVER w as flight_date,
        'capital_voyager' as name
      FROM source
      WHERE
        departure_airport IN ('ABV', 'ACC', 'ADD', 'AEP', 'ALG', 'AMM', 'AMS', 'ARN', 'ASM', 'ASU', 'ATH', 'AUH', 'BEG', 'BER',
        'BEY', 'BGW', 'BJL', 'BKK', 'BKO', 'BMA', 'BOG', 'BRN', 'BRU', 'BSB', 'BTS', 'BUD', 'CAI', 'CBR', 'CCS', 'CDG', 'CGK',
        'CIA', 'CMB', 'CPH', 'CRL', 'DAC', 'DAM', 'DCA', 'DEL', 'DME', 'DMK', 'DOD', 'DOH', 'DSS', 'DUB', 'DYU', 'EBB', 'ESB',
        'EVN', 'EZE', 'FCO', 'FNJ', 'GMP', 'GUA', 'GYD', 'HAN', 'HAV', 'HEL', 'HND', 'HRE', 'IAD', 'ICN', 'IEV', 'IKA', 'ISB',
        'KBL', 'KBP', 'KEF', 'KGL', 'KIN', 'KIV', 'KRT', 'KTM', 'KUL', 'KWI', 'LAD', 'LBV', 'LCY', 'LGW', 'LHR', 'LIM', 'LIS',
        'LJU', 'LPB', 'LTN', 'LUN', 'LUX', 'MAD', 'MCT', 'MEX', 'MGQ', 'MLA', 'MNL', 'MRU', 'MSQ', 'MVD', 'NBO', 'NDJ', 'NIM',
        'NQZ', 'NRT', 'NYT', 'ORY', 'OSL', 'OTP', 'PAP', 'PEK', 'PKX', 'PNH', 'PRG', 'PRY', 'PTY', 'RAI', 'RBA', 'RIX', 'RUH',
        'SAH', 'SAL', 'SCL', 'SDQ', 'SIN', 'SJJ', 'SJO', 'SKP', 'SOF', 'STN', 'SVO', 'SXF', 'TAS', 'TBS', 'TGD', 'THR', 'TIA',
        'TIP', 'TLL', 'TNR', 'TUN', 'UBN', 'UIO', 'VIE', 'VKO', 'VNO', 'VTE', 'WAW', 'WDH', 'WLG', 'YAO', 'YOW', 'ZAG', 'ZIA')
        AND
        arrival_airport IN ('ABV', 'ACC', 'ADD', 'AEP', 'ALG', 'AMM', 'AMS', 'ARN', 'ASM', 'ASU', 'ATH', 'AUH', 'BEG', 'BER',
        'BEY', 'BGW', 'BJL', 'BKK', 'BKO', 'BMA', 'BOG', 'BRN', 'BRU', 'BSB', 'BTS', 'BUD', 'CAI', 'CBR', 'CCS', 'CDG', 'CGK',
        'CIA', 'CMB', 'CPH', 'CRL', 'DAC', 'DAM', 'DCA', 'DEL', 'DME', 'DMK', 'DOD', 'DOH', 'DSS', 'DUB', 'DYU', 'EBB', 'ESB',
        'EVN', 'EZE', 'FCO', 'FNJ', 'GMP', 'GUA', 'GYD', 'HAN', 'HAV', 'HEL', 'HND', 'HRE', 'IAD', 'ICN', 'IEV', 'IKA', 'ISB',
        'KBL', 'KBP', 'KEF', 'KGL', 'KIN', 'KIV', 'KRT', 'KTM', 'KUL', 'KWI', 'LAD', 'LBV', 'LCY', 'LGW', 'LHR', 'LIM', 'LIS',
        'LJU', 'LPB', 'LTN', 'LUN', 'LUX', 'MAD', 'MCT', 'MEX', 'MGQ', 'MLA', 'MNL', 'MRU', 'MSQ', 'MVD', 'NBO', 'NDJ', 'NIM',
        'NQZ', 'NRT', 'NYT', 'ORY', 'OSL', 'OTP', 'PAP', 'PEK', 'PKX', 'PNH', 'PRG', 'PRY', 'PTY', 'RAI', 'RBA', 'RIX', 'RUH',
        'SAH', 'SAL', 'SCL', 'SDQ', 'SIN', 'SJJ', 'SJO', 'SKP', 'SOF', 'STN', 'SVO', 'SXF', 'TAS', 'TBS', 'TGD', 'THR', 'TIA',
        'TIP', 'TLL', 'TNR', 'TUN', 'UBN', 'UIO', 'VIE', 'VKO', 'VNO', 'VTE', 'WAW', 'WDH', 'WLG', 'YAO', 'YOW', 'ZAG', 'ZIA')
      WINDOW w AS (ORDER BY start_datetime ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'dawn_encounter' as name
      FROM checks
      WHERE time_check = 0
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'date_line_crossing' as name
      FROM checks2
      WHERE cross_dateline_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'back_to_future' as name
      FROM checks
      WHERE back_to_future_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'equator' as name
      FROM checks
      WHERE equator_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'hemisphere_switch' as name
      FROM checks2
      WHERE cross_hemispheres = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'midnight_flyer' as name
      FROM checks
      WHERE time_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'mountain_peak' as name
      FROM checks
      WHERE high_altitude_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'new_year' as name
      FROM checks
      WHERE new_year_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'polar_explorer' as name
      FROM checks
      WHERE polar_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'short_jump' as name
      FROM checks
      WHERE distance_check = 0
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'summer_solstice' as name
      FROM checks
      WHERE summer_solstice_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'timezone_jump' as name
      FROM checks
      WHERE multiple_timezones_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'ultra_long_haul' as name
      FROM checks
      WHERE distance_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
      UNION ALL
      SELECT DISTINCT
        FIRST_VALUE(flight_id) OVER w as flight_id,
        FIRST_VALUE(flight_date) OVER w as flight_date,
        'winter_solstice' as name
      FROM checks
      WHERE winter_solstice_check = 1
      WINDOW w AS (ORDER BY flight_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)
    )

  SELECT
    name,
    flight_date,
    departure_airport,
    arrival_airport
  FROM data
    INNER JOIN flights USING (flight_id);
