# AirPlain

## Idea

On September 30, 2024, the [App in the Air application](https://en.wikipedia.org/wiki/App_in_the_Air), which I had been using for many years, announced its closure. Users had until October 19 to download their data and find an alternative. In mid-October, I downloaded my data (I should note that it was incomplete, and I had to manually supplement it with actual flight times, aircraft types, etc.), but I only started looking for an alternative in November — and it turned out that there was simply nothing comparable for Android! I tried several somewhat tolerable applications, but none of them were convenient to use. Therefore, in mid-December 2024, I finally decided to create my own application.

The interface was based on App in the Air, some features were inspired by Flighty, and I came up with many ideas myself. After three months of data preparation and development, the first version of AirPlain is now ready for release.

## Features

### Flights

The main purpose of the application is to store data about actual and past flights. For actual flights, it displays information about the actual departure/arrival times, terminal data, check-in counters, boarding gates, baggage claim belts, and weather data at the arrival airport (available when connecting to the corresponding APIs).

<img src="https://github.com/user-attachments/assets/4ba2afdb-7045-4e9e-8b98-0b9bde406425" style="width: 250px; align: left;" />
<img src="https://github.com/user-attachments/assets/6dae0d9c-ec9c-45bb-a5db-357b7871765b" style="width: 250px; align: left;" />
<img src="https://github.com/user-attachments/assets/1d8532f3-3b24-400f-933d-ee334eb4b36d" style="width: 250px; align: left;" />

For some airlines, online check-in information is available, and you can go to the website automatically logged in (using data from your profile and flight).

If you add boarding pass data (by scanning it, adding a code image, or uploading a pkpass file), you can present it for scanning directly from the application.

Past flights are used for statistics and achievement awards, which can be viewed in your profile. Complete information about each flight can be obtained by clicking on the card.

<img src="https://github.com/user-attachments/assets/308d2b01-3dea-4586-9ab6-f4e03be19627" style="width: 250px; align: left;" />
<img src="https://github.com/user-attachments/assets/ba49f90e-c0e8-4362-888a-14c2857f02ae" style="width: 250px; align: left;" />

### Statistics

Flight data allows you to view interesting statistics for all time or broken down by years: total number of flights, time in the air, distance, etc., as well as information about your average flight.

<img src="https://github.com/user-attachments/assets/7f4fd98a-55b2-445e-914b-4d99ddf09617" style="width: 250px; align: left;" />

### Profile

In your profile, you can enter your first and last name (to simplify online check-in) and keep notes (such as passport data so you don't have to search for it).

You can also view achievements here, which are given both for visiting countries and for specific flights. You can, of course, share your achievements with friends.

<img src="https://github.com/user-attachments/assets/af90b31b-6725-4ad4-bb38-f825a136ba6a" style="width: 250px; align: left;" />
<img src="https://github.com/user-attachments/assets/c16b48b7-ad66-46a5-95e7-467dd08ae223" style="width: 250px; align: left;" />
<img src="https://github.com/user-attachments/assets/79ded914-1d32-4435-8f6a-aaf84da0cdcc" style="width: 250px; align: left;" />

### Settings

Information about [obtaining API keys](API.md) and [importing data](IMPORT.md) is available in the corresponding documents.

<img src="https://github.com/user-attachments/assets/9d69e9d6-a029-420c-b687-0bf1b2f168cd" style="width: 250px; align: left;" />

**Weather**

If you want to see the weather situation at the arrival airport, you will need to enter a Weather API key and choose the degrees and type of temperature display.

**Limits**

Here you can set the maximum number of flights displayed in the list and enable automatic data updates via API. If it is disabled, you can update the data either by pulling down the flight list or in the card of a specific flight.

## Additional Information

- The application can work without API access and internet, so you can use it as a simple and convenient storage for flight information.
- Notifications for actual flights are grouped into several channels; for each, you can set your own display conditions or completely disable them. This feature is available through the application's system settings.
- A flight can be deleted by long-pressing on the card.
- In the flight card, blocks can be moved (use long press). Copy mode is also available — then you can select any text with a long press.

## System Requirements

The application has minimal requirements. Your device must meet the following criteria:

- **Operating System**: Android 10.0 or higher.
- **Storage**: Sufficient space to store data.
- **Permissions**: Notifications.

## Data Privacy

All data entered into the application is stored **locally on the device**. No data is transmitted to external servers or third parties. This ensures complete user privacy and data security.

## What's Next

FlightAware API will also be added.

## Releases

Compiled APK files for Android are provided with each release. You can download the latest version from the [Releases](https://github.com/zhenya-mamenko/airplain/releases) section of this repository.

## License and Open Source Commitment

This project is licensed under the MIT License and will always remain open-source and free to use. Users are encouraged to modify, adapt, or extend the application as needed for personal or commercial purposes.

## Author

[Zhenya Mamenko](https://github.com/zhenya-mamenko/airplain)
