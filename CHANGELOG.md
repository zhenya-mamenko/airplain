# Change Log

All notable changes to this project will be documented in this file.

## 0.4.5

- Bugfix: Fixed an issue scanning barcodes.
- Improvement: Improved the readability of statistics data.
- Chore: Updated build tools and scripts.

## 0.4.4

- Bugfix: Fixed incorrect text size on the flight page.
- Bugfix: Fixed incorrect timezone conversion when adding a flight manually.
- Bugfix: Fixed screen brightness being reset while viewing a boarding pass.
- Chore: Updated the minimum SDK version to 36 (Android 16).
- Chore: Updated dependencies.

## 0.4.3

- Bugfix: Fixed incorrect flight date comparison between API response and local database.
- Bugfix: Fixed a race condition that could delete an existing notification before a replacement was created.
- Chore: Updated minimum SDK version to 34 (Android 14) and architecture to arm64-v8a only.
- Chore: Updated dependencies.

## 0.4.2

- Bugfix: Fixed incorrect blur handling in "Add flight" when selecting the "Go to settings" option.
- Improvement: Hid Top 10 statistics blocks when no data is available.
- Improvement: Added full statistics for Top 10 blocks.
- Chore: Updated dependencies.

## 0.4.1

- Bugfix: Fixed the default tab selection to show actual flights instead of past flights.
- Feature: Added a new image and camera picker with a crop tool.
- Chore: Updated code to support new libraries.

## 0.4.0

- Feature: Added the RapidAPI integration for AeroDataBox to enable free usage.
- Chore: Updated dependencies.

## 0.3.4

- Bugfix: Fixed flight data being updated with invalid cached values from native code.
- Bugfix: Fixed the date format in scheduled notifications.
- Chore: Updated dependencies.

## 0.3.3

- Bugfix: Fixed incorrect positioning of forecast icons.
- Refactoring: Refactored the native background task to handle push notifications correctly.
- Improvement: Added test coverage for the native modules.
- Chore: Updated dependencies.

## 0.3.2

- Improvement: Automatically select the correct leg when adding a multi-leg boarding pass to an existing flight.
- Feature: Added the ability to edit flight distance.
- Chore: Updated dependencies.

## 0.3.1

- Feature: Added ICAO aircraft types.

## 0.3.0

- Feature: Added the FlightAware API.
- Bugfix: The app now checks API authorization status when searching for a flight and shows an appropriate message.
- Bugfix: Fixed several typos.

## 0.2.5

- Feature: Added more statistics.

## 0.2.4

- Bugfix: Fixed a possible race condition while opening or reading the database.
- Chore: Updated dependencies.

## 0.2.3

- Feature: Added a weather forecast to the flight details card.
- Bugfix: Fixed the achievements cache not clearing on refresh.
- Bugfix: Fixed a crash when opening the Date/Time dialog.

## 0.2.2

- Bugfix: Fixed multiple issues introduced by dependency updates.

## 0.2.1

- Bugfix: Fixed a blank screen and unresponsiveness when changing flight status.
- Bugfix: Fixed the seat number not displaying after loading a boarding pass.
- Feature: Added buttons to test API connections.
- Chore: Updated dependencies.

## 0.2.0

- Bugfix: Fixed an error that occurred when adding passenger data.
- Refactoring: Refactored the SQLite module for better performance and maintainability.
- Improvement: Improved the UTC timezone display in the flight details card for clarity.
- Improvement: Added comprehensive test coverage.

## 0.1.10

- Bugfix: Fixed incorrect drag handling in the flight details card.
- Bugfix: Fixed automatic refreshing of actual flights.
- Feature: Added timezone displays to the flight details card.

## 0.1.9

- Bugfix: Fixed the boarding pass barcode format for camera scanning.
- Bugfix: Fixed incorrect colors in dark mode.
- Bugfix: Fixed timezone validation on arrival.
- Feature: Added boarding pass displays to the flight details card.
- Improvement: Set Ryanair's online check-in start time to 24 hours before departure.
- Chore: Updated dependencies.

## 0.1.8

- Improvement: Forced a request to the flights API on manual refresh.
- Refactoring: Extracted import and export logic into helper functions and added unit tests.
- Bugfix: Set the correct status and `is_archived` value based on the arrival date during import.
- Bugfix: Fixed flight existence checks during import.
- Bugfix: Fixed select colors when using the dark theme.

## 0.1.7

- Bugfix: Fixed the "Have a nice flight" message displaying when online check-in is available.
- Bugfix: Fixed incorrect date and time displays when updating flight information.
- Bugfix: Fixed flight data not updating in the list after editing.
- Improvement: Improved Gemini workflows.
- Chore: Updated dependencies.

## 0.1.6

- Bugfix: Fixed data export failing when `flights.csv` already exists.
- Chore: Updated dependencies.

## 0.1.5

- Bugfix: Fixed statistics and achievements not updating after importing flights.
- Bugfix: Fixed a zero distance value not displaying on the Statistics tab when there are no past flights.
- Bugfix: Fixed an incorrect date label for flights near a month boundary in a previous year.
- Bugfix: Fixed incorrect flight data for codeshare flights.
- Chore: Updated dependencies.
- Refactoring: Refactored several functions and added unit and integration tests.

## 0.1.4

- Improvement: Made minor UX improvements.
- Bugfix: Fixed several issues.
- Chore: Optimized release builds.

## 0.1.2

- Feature: Added the initial release of AirPlain, a simple but powerful app for managing flights.
- Feature: Added actual departure and arrival times, terminal information, check-in counters, boarding gates, baggage claim belts, and weather data at the arrival airport.
- Feature: Added flight statistics for all time or by year, including flight count, time in the air, distance, and more.
- Feature: Added profile achievements for visiting countries and completing specific flights.

