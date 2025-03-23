# Importing Flight Data

Data for import must be in a CSV file (comma-separated) and contain the following fields:

* `airline` - IATA airline code (required)
* `flight_number` - Flight number (required)
* `departure_airport` - Departure airport IATA code (required)
* `departure_country` - Departure country code ISO 3166-1 alpha-2 (required)
* `departure_airport_timezone` - Departure airport timezone (required)
* `arrival_airport` - Arrival airport IATA code (required)
* `arrival_country` - Arrival country code ISO 3166-1 alpha-2 (required)
* `arrival_airport_timezone` - Arrival airport timezone (required)
* `start_datetime` - Flight start datetime (required)
* `end_datetime` - Flight end datetime (required)
* `distance` - Flight distance in kilometers (required)
* `actual_end_datetime` - Flight actual end datetime
* `actual_start_datetime` - Flight actual start datetime
* `departure_terminal` - Departure terminal
* `departure_check_in_desk` - Departure check-in desk
* `departure_gate` - Departure gate
* `arrival_terminal` - Arrival terminal
* `baggage_belt` - Baggage belt number
* `aircraft_type` - IATA code of the aircraft type or just type name of the aircraft
* `aircraft_reg_number` - Aircraft registration number
* `status` - Flight status. Can be `arrived` or `cancelled`

After completing the import, the number of added records will be displayed.
