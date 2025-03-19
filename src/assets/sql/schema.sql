CREATE TABLE IF NOT EXISTS aircraft_types (
  aircraft_type_code VARCHAR(5) NOT NULL PRIMARY KEY,
  aircraft_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS airlines (
  airline_id INTEGER NOT NULL PRIMARY KEY,
  airline_code VARCHAR(2) NOT NULL,
  airline_name VARCHAR(100) NOT NULL,
  check_in_link VARCHAR(200) DEFAULT '',
  check_in_time INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS airports (
  airport_id INTEGER NOT NULL PRIMARY KEY,
  iata_code VARCHAR(3) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  airport_name VARCHAR(150) NOT NULL,
  airport_latitude REAL NOT NULL,
  airport_longitude REAL NOT NULL,
  elevation INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS airports_iata_code ON airports (iata_code);

CREATE TABLE IF NOT EXISTS flights (
  flight_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  airline_id INTEGER NULL,
  flight_number VARCHAR(5) NOT NULL,
  departure_airport VARCHAR(3) NOT NULL,
  departure_country VARCHAR(2) NOT NULL,
  departure_airport_timezone VARCHAR(50) NOT NULL,
  arrival_airport VARCHAR(3) NOT NULL,
  arrival_country VARCHAR(2) NOT NULL,
  arrival_airport_timezone VARCHAR(50) NOT NULL,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  distance INTEGER NOT NULL,
  actual_end_datetime DATETIME,
  actual_start_datetime DATETIME,
  departure_terminal VARCHAR(10),
  departure_check_in_desk VARCHAR(5),
  departure_gate VARCHAR(10),
  arrival_terminal VARCHAR(10),
  baggage_belt VARCHAR(5),
  aircraft_type VARCHAR(100),
  aircraft_reg_number VARCHAR(10),
  status VARCHAR(20) NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT 0,
  record_type INTEGER NOT NULL DEFAULT 0,
  extra TEXT NOT NULL DEFAULT '{}',
  notes VARCHAR(250) NOT NULL DEFAULT '',
  FOREIGN KEY (airline_id) REFERENCES airlines(airline_id)
);

CREATE INDEX IF NOT EXISTS flights_departure_airport ON flights (departure_airport);
CREATE INDEX IF NOT EXISTS flights_arrival_airport ON flights (arrival_airport);

CREATE TABLE IF NOT EXISTS passengers (
  passenger_id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  flight_id INTEGER NOT NULL,
  pnr VARCHAR(7) NOT NULL,
  passenger_name VARCHAR(30) NOT NULL,
  seat_number VARCHAR(4),
  bcbp TEXT NOT NULL DEFAULT '{"data": null, "format": null, "pkpass": null}',
  FOREIGN KEY (flight_id) REFERENCES flights(flight_id)
);
