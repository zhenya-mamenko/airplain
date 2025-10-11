# Importing Flight Data

Data for import must be in a CSV file (comma-separated) and contain the following fields:

- `airline` - IATA airline code (required), e.g. `FR`
- `flight_number` - Flight number (required), e.g. `123`
- `departure_airport` - Departure airport IATA code (required), e.g. `CDG`
- `departure_country` - Departure country code ISO 3166-1 alpha-2 (required), e.g. `FR`
- `departure_airport_timezone` - Departure airport timezone (required), e.g. `Europe/Paris`
- `arrival_airport` - Arrival airport IATA code (required), e.g. `JFK`
- `arrival_country` - Arrival country code ISO 3166-1 alpha-2 (required), e.g. `US`
- `arrival_airport_timezone` - Arrival airport timezone (required), e.g. `America/New_York`
- `start_datetime` - Flight start datetime (required), e.g. `2024-09-29 12:15:00+02:00`
- `end_datetime` - Flight end datetime (required), e.g. `2024-09-29 19:15:00-04:00`
- `distance` - Flight distance in kilometers (required), e.g. `6166`
- `actual_end_datetime` - Flight actual end datetime, same format as `end_datetime`
- `actual_start_datetime` - Flight actual start datetime, same format as `start_datetime`
- `departure_terminal` - Departure terminal, e.g. `1`
- `departure_check_in_desk` - Departure check-in desk, e.g. `60-69`
- `departure_gate` - Departure gate, e.g. `A10`
- `arrival_terminal` - Arrival terminal, e.g. `2`
- `baggage_belt` - Baggage belt number, e.g. `07`
- `aircraft_type` - IATA code of the aircraft type or just type name of the aircraft, e.g. `32A` or `Airbus A320 (sharklets)`
- `aircraft_reg_number` - Aircraft registration number, e.g. `HB-JXU`
- `status` - Flight status. Can be `arrived` or `cancelled`

After completing the import, the number of added records will be displayed.
