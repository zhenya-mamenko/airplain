# Change Log

All notable changes to this project will be documented in this file.

## 0.4.4

- Bugfix: Fixed incorrect text size on the flight page.
- Bugfix: Fixed incorrect timezone conversion when adding a flight manually.
- Bugfix: Fixed screen brightness being reset while viewing a boarding pass.
- Chore: Updated minimum SDK version to 36 (Android 16)
- Chore: Updated dependencies.

## 0.4.3

- Bugfix: Fixed incorrect flight date comparison between API response and local database.
- Bugfix: Fixed a race condition that could delete an existing notification before a replacement was created.
- Chore: Updated minimum SDK version to 34 (Android 14) and architecture to arm64-v8a only.
- Chore: Updated dependencies.

## 0.4.2

- Bugfix: Wrong blur handling in "Add flight" when selected "Go to settings" option.
- Improvement: Top 10 stats blocks don't appear when no stats data is available.
- Improvement: Full stats for Top 10 blocks now available.
- Chore: Updated dependencies.

## 0.4.1

- Bugfix: Past flights tab selected by default, should be Actual flights.
- Feature: New image/camera picker and crop tool.
- Chore: Some code updated according to new libraries.

## 0.4.0

- Feature: Added Rapid API for AeroDataBox, so it can be used for free.
- Chore: Updated dependencies.

## 0.3.4

- Bugfix: Flight data updated by invalid cached value from native code.
- Bugfix: Wrong date format in scheduled notifications.
- Chore: Updated dependencies.

## 0.3.3

- Fix: Incorrect positioning of forecast icons.
- Refactoring: Multiple changes to the native background task to properly handle push notifications.
- Improvement: Added test coverage for the native modules.
- Chore: Updated dependencies.

## 0.3.2

- Update: When adding a multi-leg boarding pass to an existing flight, the correct leg is now selected automatically.
- Update: Flight distance can be edited.
- Chore: Updated dependencies.

## 0.3.1

- Update: Added ICAO aircraft types.

## 0.3.0

- Feature: Added FlightAware API.
- Bugfix: The app now checks API authorization status when searching for a flight and shows an appropriate message.
- Bugfix: Fixed several typos.

## 0.2.5

- Feature: Added more statistics.

## 0.2.4

- Bugfix: Fixed possible race condition in database opening/reading.
- Chore: Updated dependencies.

## 0.2.3

- Feature: Weather forecast displays in flight details card.
- Update: Achievements' cache clears on refresh.
- Bugfix: Fixed crash on show Date/Time dialog.

## 0.2.2

Fixed multiple bugs after dependencies updates.

## 0.2.1

- Bugfix: Changing flight status created white screen and no response.
- Bugfix: Seat number not shown after boarding pass loading.
- Feature: Added buttons to test API connections.
- Chore: Updated dependencies.

## 0.2.0

- Bugfix: Fixed an error that occurred when adding passenger data.
- Refactoring: Refactored SQLite module for better performance and maintainability.
- Update: Updated UTC timezone display in flight details card for clarity.
- Improvement: Added comprehensive test coverage.

## 0.1.10

- Bugfix: Corrected wrong drag handling in the flight details card.
- Bugfix: Fixed automatic refreshing of actual flights.
- Feature: Display timezones in the flight details card.

## 0.1.9

- Bugfix: Corrected boarding pass barcode format for camera scanning.
- Bugfix: Resolved incorrect colors in dark mode.
- Bugfix: Fixed timezone validation on arrival.
- Feature: Display boarding pass from the flight details card.
- Update: Set online check-in start time to 24 hours for Ryanair.
- Chore: Updated dependencies.

## 0.1.8

- Feature: Force the flights API to be requested on manual refresh.
- Refactoring: Extracted import and export data logic into helper functions and added unit tests.
- Bugfix: Set the correct status and is_archived based on the arrival date in the import task.
- Bugfix: Fixed flight existence checking in the import task.
- Bugfix: Fixed color issue in selects when Dark theme is used.

## 0.1.7

- Bugfix: "Have a nice flight" shown if online registration is available.
- Bugfix: Wrong datetime shown when updating flight information (departure or arrival date).
- Bugfix: Flight data in list not updated after editing.
- Update: Gemini workflows and workflow improvements.
- Chore: Updated dependencies.

## 0.1.6

- Bugfix: Export data doesn't work if flights.csv already exists.
- Chore: Updated dependencies.

## 0.1.5

- Bugfix: Statistics and achievements are not updated after import flights.
- Bugfix: Zero value for distance is not shown on Stats tab if there are no past flights.
- Bugfix: Date label may be wrong if flight was on month's edge in past year.
- Bugfix: Wrong flight data record if it was a codesharing flight.
- Chore: Updated dependencies.
- Some functions were refactored; unit and integration tests were added.

## 0.1.4

Minor UX improvements and a few bug fixes were made. Release build optimizations were also implemented.

## 0.1.2

The first version of AirPlain: a simple but powerful app for managing your flights.

Highlights:
- Displays actual departure/arrival times, terminal data, check-in counters, boarding gates, baggage claim belts, and weather data at the arrival airport
- Interesting flight statistics, for all time or broken down by year: total number of flights, time in the air, distance, and more
- Achievements in your profile, awarded for visiting countries and for specific flights
