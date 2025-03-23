# AirPlain

## Idea

On September 30, 2024, the [App in the Air application](https://en.wikipedia.org/wiki/App_in_the_Air), which I had been using for many years, announced its closure. Users had until October 19 to download their data and find an alternative. In mid-October, I downloaded my data (I should note that it was incomplete, and I had to manually supplement it with actual flight times, aircraft types, etc.), but I only started looking for an alternative in November — and it turned out that there was simply nothing comparable for Android! I tried several somewhat tolerable applications, but none of them were convenient to use. Therefore, in mid-December 2024, I finally decided to create my own application.

The interface was based on App in the Air, some features were inspired by Flighty, and I came up with many ideas myself. After three months of data preparation and development, the first version of AirPlain is now ready for release.

## Features

### Flights
The main purpose of the application is to store data about current and past flights. For current flights, it displays information about the actual departure/arrival times, terminal data, check-in counters, boarding gates, baggage claim belts, and weather data at the arrival airport (available when connecting to the corresponding APIs).

For some airlines, online check-in information is available, and you can go to the website automatically logged in (using data from your profile and flight).

If you add boarding pass data (by scanning it, adding a code image, or uploading a pkpass file), you can present it for scanning directly from the application.

Past flights are used for statistics and achievement awards, which can be viewed in your profile.
Complete information about each flight can be obtained by clicking on the card.

### Statistics
Flight data allows you to view interesting statistics for all time or broken down by years: total number of flights, time in the air, distance, etc., as well as information about your average flight.

### Profile
In your profile, you can enter your first and last name (to simplify online check-in) and keep notes (such as passport data so you don't have to search for it).

You can also view achievements here, which are given both for visiting countries and for specific flights. You can, of course, share your achievements with friends.

### Settings

Information about [obtaining API keys](API.md) and [importing data](IMPORT.md) is available in the corresponding documents.

**Weather**

If you want to see the weather situation at the arrival airport, you will need to enter a Weather API key and choose the degrees and type of temperature display.

**Limits**

Here you can set the maximum number of flights displayed in the list and enable automatic data updates via API. If it is disabled, you can update the data either by pulling down the flight list or in the card of a specific flight.

## Additional Information

* The application can work without API access and internet, so you can use it as a simple and convenient storage for flight information.
* Notifications for current flights are grouped into several channels; for each, you can set your own display conditions or completely disable them. This feature is available through the application's system settings.
* A flight can be deleted by long-pressing on the card.
* In the flight card, blocks can be moved (use long press). Copy mode is also available — then you can select any text with a long press.

## What's Next

Now it will be necessary to write automated unit and integration tests. FlightAware API will also be added.
