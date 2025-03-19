DELETE FROM passengers WHERE flight_id >= 282; --IN (282, 283, 284);
DELETE FROM flights WHERE flight_id  >= 282; --IN (282, 283, 284);

INSERT OR REPLACE INTO flights (flight_id, airline_id, flight_number, departure_airport, departure_country, departure_airport_timezone,
  arrival_airport, arrival_country, arrival_airport_timezone, start_datetime, end_datetime, distance, status,
  is_archived, record_type, departure_terminal, arrival_terminal) VALUES
  (282, 970, 1742, 'LIS', 'PT', 'Europe/Lisbon', 'ESB', 'TR', 'Europe/Istanbul', '2025-03-06 21:45:00Z', '2025-03-07 05:40:00+03:00', 3584, 'scheduled', false, 1, '1', null),
  (283, 970, 2687, 'ESB', 'TR', 'Europe/Istanbul', 'SAW', 'TR', 'Europe/Istanbul', '2025-03-07 07:05:00+03:00', '2025-03-07 08:15:00+03:00', 326, 'scheduled', 0, 1, null, null),
  (284, 970, 310, 'SAW', 'TR', 'Europe/Istanbul', 'BUS', 'GE', 'Asia/Tbilisi', '2025-03-07 11:55:00+03:00', '2025-03-07 14:45:00+04:00', 1056, 'scheduled', 0, 1, null, null);
INSERT OR REPLACE INTO passengers (flight_id,  pnr, passenger_name) VALUES
  (282, '9SBDYT', 'Evgenii Mamenko'),
  (283, '9SBDYT', 'Evgenii Mamenko'),
  (284, '9SBDM2', 'Evgenii Mamenko');


UPDATE passengers
SET bcbp ='{
  "data": "M1MAMENKO/EVGENII     E2IIBFD LISPDLS4 0121 261Y016F0051 348>5180  4259B1A              2A33171204910020                           N",
  "format": "PKBarcodeFormatAztec",
  "pkpass": {
    "airline": "S4",
    "barcode": {
      "altText": "",
      "format": "PKBarcodeFormatAztec",
      "message": "M1MAMENKO/EVGENII     E2IIBFD LISPDLS4 0121 261Y016F0051 348>5180  4259B1A              2A33171204910020                           N",
      "messageEncoding": "UTF-8"
    },
    "boardingPass": {
      "auxiliaryFields": [
        {
          "label": "Passenger",
          "value": "MAMENKO/EVGENII",
          "key": "passenger"
        },
        {
          "label": "Seat",
          "value": "16F",
          "key": "seat"
        },
        {
          "label": "Gate",
          "value": "—",
          "key": "gate"
        }
      ],
      "headerFields": [
        {
          "label": "Flight number",
          "value": "S4 121",
          "key": "flightNumber"
        }
      ],
      "primaryFields": [
        {
          "label": "Lisbon-Portela Airport",
          "value": "LIS",
          "key": "departureAirportCode"
        },
        {
          "label": "Ponta Delgada-João Paulo II Airport",
          "value": "PDL",
          "key": "arrivalAirportCode"
        }
      ],
      "secondaryFields": [
        {
          "label": "Date",
          "value": "Sep 17",
          "key": "date"
        },
        {
          "label": "Cabin",
          "value": "Y",
          "key": "cabinType"
        },
        {
          "label": "Vetting status",
          "value": "0",
          "key": "vettingStatus"
        },
        {
          "label": "Sequence No",
          "value": "0051",
          "key": "seqNo"
        }
      ]
    },
    "colors": {
      "backgroundColor": "#ffffff",
      "labelColor": "#000000",
      "foregroundColor": "#000000"
    },
    "images": {
      "logo": {
        "image": "data:image/png;base64,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",
        "ratio": 1
      }
    }
  }
}' WHERE flight_id = 282;

UPDATE
  flights
SET
  departure_check_in_desk = 'B60-B67',
  extra = '{"carrier": "VY", "carrierName": "Vueling", "carrierFlightNumber": "1234"}'
WHERE flight_id = 282;

-- INSERT OR REPLACE INTO flights (
--   actual_end_datetime, actual_start_datetime,
--   arrival_airport, arrival_airport_timezone, arrival_country,
--   departure_airport, departure_airport_timezone, departure_country,
--   distance, end_datetime, extra, flight_number, is_archived, record_type,
--   start_datetime, status, airline_id)
--   VALUES (
--     '2025-02-16 04:40:00-09:00', '2025-02-16 00:40:00+01:00',
--     'AAC', 'Africa/Cairo', 'EG',
--     'AAE', 'Africa/Algiers', 'DZ',
--     7149, '2025-02-16 04:40:00-09:00', '{}', '321', '0', 2,
--     '2025-02-16 00:40:00+01:00', 'scheduled', 609
--   )


-- 282,970,1742,LIS,PT,Europe/Lisbon,ESB,TR,Europe/Istanbul,2025-03-06 21:45:00Z,2025-03-07 05:40:00+03:00,3584,arrived,false,1,1,
-- 283,970,2687,ESB,TR,Europe/Istanbul,SAW,TR,Europe/Istanbul,2025-03-07 07:05:00+03:00,2025-03-07 08:15:00+03:00,326,arrived,0,1,,
-- 284,970,310,SAW,TR,Europe/Istanbul,BUS,GE,Asia/Tbilisi,2025-03-07 11:55:00+03:00,2025-03-07 14:45:00+04:00,1056,arrived,0,1,,
