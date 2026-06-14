package com.mamenko.airplain

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlin.math.ceil
import kotlin.math.floor

object NativeBackgroundProcessor {
    private const val FLIGHT_CHANNEL_ID = "flight"
    private const val URGENT_CHANNEL_ID = "urgent"
    private const val HTTP_TIMEOUT_MS = 3000

    private val adbFlightStatuses = mapOf(
        "Approaching" to "en_route",
        "Arrived" to "arrived",
        "Boarding" to "boarding",
        "Canceled" to "canceled",
        "CanceledUncertain" to "unknown",
        "CheckIn" to "checkin",
        "Delayed" to "delayed",
        "Departed" to "departed",
        "Diverted" to "diverted",
        "EnRoute" to "en_route",
        "Expected" to "scheduled",
        "GateClosed" to "gateclosed",
        "Unknown" to "unknown",
    )

    private val aeroApiFlightStatuses = mapOf(
        "arrived" to "arrived",
        "boarding" to "boarding",
        "canceled" to "canceled",
        "cancelled" to "canceled",
        "checkin" to "checkin",
        "delayed" to "delayed",
        "departed" to "departed",
        "diverted" to "diverted",
        "enroute" to "en_route",
        "gateclosed" to "gateclosed",
        "ontime" to "on_time",
        "scheduled" to "scheduled",
        "unknown" to "unknown",
    )

    internal data class ApiFlightData(
        val actualEndDatetime: String?,
        val actualStartDatetime: String?,
        val arrivalTerminal: String?,
        val baggageBelt: String?,
        val departureCheckInDesk: String?,
        val departureGate: String?,
        val departureTerminal: String?,
        val status: String?,
        val success: Boolean,
    )

    internal var foregroundChecker: () -> Boolean = { isAppInForeground() }
    internal var flightDataFetcher: (JSONObject, JSONObject) -> ApiFlightData = { config, flight ->
        fetchFlightData(config, flight)
    }
    internal var notificationSender: (Context, JSONObject, String, Boolean) -> Unit = { context, flight, body, urgent ->
        showNotification(context, flight, body, urgent)
    }

    internal fun resetTestHooks() {
        foregroundChecker = { isAppInForeground() }
        flightDataFetcher = { config, flight -> fetchFlightData(config, flight) }
        notificationSender = { context, flight, body, urgent -> showNotification(context, flight, body, urgent) }
    }

    fun process(context: Context) {
        if (foregroundChecker()) {
            Log.d("AirPlain", "Skipping native background processing because app is in foreground")
            return
        }

        val config = try {
            JSONObject(BackgroundStateStore.getConfig(context))
        } catch (e: Exception) {
            Log.w("AirPlain", "Failed to parse background config", e)
            return
        }

        if (!config.optBoolean("enabled", false)) {
            Log.d("AirPlain", "Skipping native background processing because it is disabled")
            return
        }

        val flights = try {
            JSONArray(BackgroundStateStore.getFlights(context))
        } catch (e: Exception) {
            Log.w("AirPlain", "Failed to parse background flights snapshot", e)
            return
        }

        val pollState = try {
            JSONObject(BackgroundStateStore.getPollState(context))
        } catch (e: Exception) {
            Log.w("AirPlain", "Failed to parse background poll state", e)
            JSONObject()
        }

        var flightsChanged = false
        var pollStateChanged = false

        for (index in 0 until flights.length()) {
            val flight = flights.optJSONObject(index) ?: continue
            val flightId = flight.optInt("flightId", -1)
            if (flightId <= 0 || flight.optBoolean("isArchived", false) || flight.optInt("recordType", 0) != 1) {
                continue
            }

            val startIso = optStringOrNull(flight, "actualStartDatetime") ?: optStringOrNull(flight, "startDatetime") ?: continue
            val minutes = getMinutesUntil(startIso) ?: continue
            val hours = minutes / 60.0
            val bucket = getTimeSpan(hours)
            val endIso = optStringOrNull(flight, "actualEndDatetime") ?: optStringOrNull(flight, "endDatetime")
            val arrivalMinutes = endIso?.let { getMinutesSince(it) }

            val shouldCheckScheduledChanges = bucket.isNotEmpty() && shouldPollBucket(pollState, flightId, bucket, minutes)
            val shouldCheckArrivalBaggage = arrivalMinutes != null && arrivalMinutes in 0..<30 && arrivalMinutes % 5 == 0 && optStringOrNull(flight, "baggageBelt") == null

            if (bucket.isNotEmpty()) {
                val flightState = pollState.optJSONObject(flightId.toString()) ?: JSONObject()
                if (!flightState.has(bucket)) {
                    // Seed the current bucket to avoid immediate polling right after snapshot sync.
                    flightState.put(bucket, minutes)
                    pollState.put(flightId.toString(), flightState)
                    pollStateChanged = true
                }
            }

            if (!shouldCheckScheduledChanges && !shouldCheckArrivalBaggage) {
                continue
            }

            val apiData = flightDataFetcher(config, flight)
            if (!apiData.success) {
                continue
            }

            val messages = mutableListOf<String>()
            var flightUpdated = false

            if (apiData.status != null && optStringOrNull(flight, "status") != apiData.status) {
                val currentStatus = optStringOrNull(flight, "status")
                if (currentStatus == "en_route" && apiData.status == "arrived") {
                    flight.put("status", apiData.status)
                    flightUpdated = true
                } else if (shouldCheckScheduledChanges) {
                    messages.add(
                        context.getString(
                            R.string.notification_changed_status,
                            getStatusLabel(context, apiData.status),
                        )
                    )
                    flight.put("status", apiData.status)
                    flightUpdated = true
                }
            }

            if (apiData.actualStartDatetime != null && apiData.actualStartDatetime != "" && !isSameInstant(optStringOrNull(flight, "actualStartDatetime"), apiData.actualStartDatetime)) {
                if (shouldCheckScheduledChanges) {
                    messages.add(
                        context.getString(
                            R.string.notification_changed_start_datetime,
                            formatTime(apiData.actualStartDatetime),
                        )
                    )
                }
                flight.put("actualStartDatetime", apiData.actualStartDatetime)
                flightUpdated = true
            }

            if (apiData.departureTerminal != null && apiData.departureTerminal != "" && optStringOrNull(flight, "departureTerminal") != apiData.departureTerminal) {
                if (shouldCheckScheduledChanges) {
                    messages.add(
                        context.getString(
                            R.string.notification_changed_departure_terminal,
                            apiData.departureTerminal,
                        )
                    )
                }
                flight.put("departureTerminal", apiData.departureTerminal)
                flightUpdated = true
            }

            if (apiData.departureCheckInDesk != null && apiData.departureCheckInDesk != "" && optStringOrNull(flight, "departureCheckInDesk") != apiData.departureCheckInDesk) {
                if (shouldCheckScheduledChanges) {
                    messages.add(
                        context.getString(
                            R.string.notification_changed_departure_check_in_desk,
                            apiData.departureCheckInDesk,
                        )
                    )
                }
                flight.put("departureCheckInDesk", apiData.departureCheckInDesk)
                flightUpdated = true
            }

            if (apiData.departureGate != null && apiData.departureGate != "" && optStringOrNull(flight, "departureGate") != apiData.departureGate) {
                if (shouldCheckScheduledChanges) {
                    messages.add(
                        context.getString(
                            R.string.notification_changed_departure_gate,
                            apiData.departureGate,
                        )
                    )
                }
                flight.put("departureGate", apiData.departureGate)
                flightUpdated = true
            }

            if (apiData.actualEndDatetime != null && apiData.actualEndDatetime != "" && !isSameInstant(optStringOrNull(flight, "actualEndDatetime"), apiData.actualEndDatetime)) {
                if (shouldCheckScheduledChanges) {
                    messages.add(
                        context.getString(
                            R.string.notification_changed_end_datetime,
                            formatTime(apiData.actualEndDatetime),
                        )
                    )
                }
                flight.put("actualEndDatetime", apiData.actualEndDatetime)
                flightUpdated = true
            }

            if (apiData.arrivalTerminal != null && apiData.arrivalTerminal != "" && optStringOrNull(flight, "arrivalTerminal") != apiData.arrivalTerminal) {
                if (shouldCheckScheduledChanges) {
                    messages.add(
                        context.getString(
                            R.string.notification_changed_arrival_terminal,
                            apiData.arrivalTerminal,
                        )
                    )
                }
                flight.put("arrivalTerminal", apiData.arrivalTerminal)
                flightUpdated = true
            }

            if (shouldCheckArrivalBaggage && apiData.baggageBelt != null && apiData.baggageBelt != "" && optStringOrNull(flight, "baggageBelt") != apiData.baggageBelt) {
                messages.add(
                    context.getString(
                        R.string.notification_changed_baggage_belt,
                        apiData.baggageBelt,
                    )
                )
                flight.put("baggageBelt", apiData.baggageBelt)
                flightUpdated = true
            } else if (shouldCheckScheduledChanges && apiData.baggageBelt != null && apiData.baggageBelt != "" && optStringOrNull(flight, "baggageBelt") != apiData.baggageBelt) {
                messages.add(
                    context.getString(
                        R.string.notification_changed_baggage_belt,
                        apiData.baggageBelt,
                    )
                )
                flight.put("baggageBelt", apiData.baggageBelt)
                flightUpdated = true
            }

            if (arrivalMinutes != null && arrivalMinutes >= 0) {
                val status = optStringOrNull(flight, "status")
                if (status != "arrived" && status != "diverted" && status != "canceled") {
                    flight.put("status", "arrived")
                    flightUpdated = true
                }
            }

            if (messages.isNotEmpty()) {
                val useUrgentChannel = minutes in 1..<60 && shouldCheckScheduledChanges
                notificationSender(context, flight, messages.joinToString("\n"), useUrgentChannel)
            }

            if (shouldCheckScheduledChanges) {
                val flightState = pollState.optJSONObject(flightId.toString()) ?: JSONObject()
                flightState.put(bucket, minutes)
                pollState.put(flightId.toString(), flightState)
                pollStateChanged = true
            }

            if (flightUpdated) {
                flightsChanged = true
            }
        }

        if (flightsChanged) {
            BackgroundStateStore.setFlights(context, flights.toString())
        }
        if (pollStateChanged) {
            BackgroundStateStore.setPollState(context, pollState.toString())
        }
    }

    private fun shouldPollBucket(pollState: JSONObject, flightId: Int, bucket: String, minutes: Int): Boolean {
        val flightState = pollState.optJSONObject(flightId.toString()) ?: return false
        if (!flightState.has(bucket)) {
            return false
        }
        return flightState.optInt(bucket, Int.MIN_VALUE) != minutes
    }

    private fun isAppInForeground(): Boolean {
        val processInfo = ActivityManager.RunningAppProcessInfo()
        ActivityManager.getMyMemoryState(processInfo)
        return processInfo.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_VISIBLE
    }

    private fun getMinutesUntil(startIso: String): Int? {
        return try {
            val date = parseIsoDate(startIso)
            ceil((date.time - System.currentTimeMillis()) / 60000.0).toInt()
        } catch (e: Exception) {
            Log.w("AirPlain", "Failed to parse start datetime: $startIso", e)
            null
        }
    }

    private fun getMinutesSince(endIso: String): Int? {
        return try {
            val date = parseIsoDate(endIso)
            ceil((System.currentTimeMillis() - date.time) / 60000.0).toInt()
        } catch (e: Exception) {
            Log.w("AirPlain", "Failed to parse end datetime: $endIso", e)
            null
        }
    }

    private fun getTimeSpan(hours: Double): String {
        return when {
            hours >= 23 && hours < 24 -> "24h"
            hours >= 1.9 && hours <= 3 && hours == floor(hours) -> "3h"
            hours >= 0.75 && hours <= 1.5 && ceil(hours * 60).toInt() % 5 == 0 -> "90m"
            hours >= 0.25 && hours < 0.75 && ceil(hours * 60).toInt() % 3 == 0 -> "last"
            else -> ""
        }
    }

    private fun fetchFlightData(config: JSONObject, flight: JSONObject): ApiFlightData {
        val currentApi = config.optString("currentApi", "aeroapi")
        return when (currentApi) {
            "aeroapi" -> fetchFromAeroApi(config, flight)
            else -> fetchFromAerodatabox(config, flight)
        }
    }

    private fun fetchFromAerodatabox(config: JSONObject, flight: JSONObject): ApiFlightData {
        val apiUrl = config.optString("aerodataboxApiUrl")
        val apiKey = config.optString("aerodataboxApiKey")
        if (apiUrl.isBlank() || apiKey.isBlank()) {
            return ApiFlightData(null, null, null, null, null, null, null, null, false)
        }

        val url = "${apiUrl}/flights/Number/${flight.optString("airline")}${flight.optString("flightNumber")}/${flight.optString("startDatetime").take(10)}?dateLocalRole=Departure&withAircraftImage=false&withLocation=false"
        return executeJsonRequest(url, "x-magicapi-key", apiKey) { root ->
            val item = root.optJSONArray("array")?.optJSONObject(0)
            val departure = item?.optJSONObject("departure")
            val arrival = item?.optJSONObject("arrival")
            ApiFlightData(
                actualEndDatetime = optStringOrNull(arrival, "revisedTime")?.let { JSONObject(it).optString("local") },
                actualStartDatetime = optStringOrNull(departure, "revisedTime")?.let { JSONObject(it).optString("local") },
                arrivalTerminal = optStringOrNull(arrival, "terminal"),
                baggageBelt = optStringOrNull(arrival, "baggageBelt"),
                departureCheckInDesk = optStringOrNull(departure, "checkInDesk"),
                departureGate = optStringOrNull(departure, "gate"),
                departureTerminal = optStringOrNull(departure, "terminal"),
                status = adbFlightStatuses[item?.optString("status")],
                success = item != null,
            )
        }
    }

    private fun fetchFromAeroApi(config: JSONObject, flight: JSONObject): ApiFlightData {
        val apiUrl = config.optString("aeroapiApiUrl")
        val apiKey = config.optString("aeroapiApiKey")
        if (apiUrl.isBlank() || apiKey.isBlank()) {
            return ApiFlightData(null, null, null, null, null, null, null, null, false)
        }

        val date = flight.optString("startDatetime").take(10)
        val url = "${apiUrl}/flights/${flight.optString("airline")}${flight.optString("flightNumber")}?ident_type=designator&start=${date}&end=${date}T23:59:59Z"
        return executeJsonRequest(url, "x-apikey", apiKey) { root ->
            val item = root.optJSONArray("flights")?.optJSONObject(0)
            val departureTimezone = optStringOrNull(flight, "departureAirportTimezone")
            val arrivalTimezone = optStringOrNull(flight, "arrivalAirportTimezone")
            ApiFlightData(
                actualEndDatetime = (optStringOrNull(item, "actual_in") ?: optStringOrNull(item, "estimated_in"))
                    ?.let { fromUtcToLocalIsoString(it, arrivalTimezone) },
                actualStartDatetime = (optStringOrNull(item, "actual_out") ?: optStringOrNull(item, "estimated_out"))
                    ?.let { fromUtcToLocalIsoString(it, departureTimezone) },
                arrivalTerminal = optStringOrNull(item, "terminal_destination"),
                baggageBelt = optStringOrNull(item, "baggage_claim"),
                departureCheckInDesk = item?.optJSONObject("origin")?.let { optStringOrNull(it, "checkInDesk") },
                departureGate = optStringOrNull(item, "gate_origin"),
                departureTerminal = optStringOrNull(item, "terminal_origin"),
                status = normalizeAeroApiStatus(optStringOrNull(item, "status")),
                success = item != null,
            )
        }
    }

    private fun executeJsonRequest(
        url: String,
        headerName: String,
        headerValue: String,
        parser: (JSONObject) -> ApiFlightData,
    ): ApiFlightData {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = HTTP_TIMEOUT_MS
            readTimeout = HTTP_TIMEOUT_MS
            requestMethod = "GET"
            setRequestProperty(headerName, headerValue)
        }

        return try {
            val responseCode = connection.responseCode
            if (responseCode != HttpURLConnection.HTTP_OK) {
                Log.d("AirPlain", "Native API request failed with code $responseCode for $url")
                ApiFlightData(null, null, null, null, null, null, null, null, false)
            } else {
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                val json = if (body.trimStart().startsWith("[")) {
                    JSONObject().put("array", JSONArray(body))
                } else {
                    JSONObject(body)
                }
                parser(json)
            }
        } catch (e: Exception) {
            Log.d("AirPlain", "Native API request failed for $url", e)
            ApiFlightData(null, null, null, null, null, null, null, null, false)
        } finally {
            connection.disconnect()
        }
    }

    private fun normalizeAeroApiStatus(status: String?): String {
        val normalized = (status ?: "unknown").lowercase(Locale.US).replace(Regex("[\\s_-]"), "")
        return aeroApiFlightStatuses[normalized] ?: "unknown"
    }

    internal fun fromUtcToLocalIsoString(utcIsoString: String, timezone: String?): String {
        if (timezone.isNullOrBlank()) {
            return utcIsoString
        }
        return try {
            SimpleDateFormat("yyyy-MM-dd HH:mm:ssXXX", Locale.US).apply {
                timeZone = TimeZone.getTimeZone(timezone)
            }.format(parseIsoDate(utcIsoString))
        } catch (_: Exception) {
            utcIsoString
        }
    }

    private fun optStringOrNull(jsonObject: JSONObject?, key: String): String? {
        if (jsonObject == null || !jsonObject.has(key)) {
            return null
        }
        val value = jsonObject.optString(key)
        return value.takeIf { it.isNotBlank() && it != "null" }
    }

    private fun parseIsoDate(value: String): Date {
        val formats = listOf(
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mmXXX",
            "yyyy-MM-dd HH:mm:ssXXX",
            "yyyy-MM-dd HH:mmXXX",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
        )
        for (format in formats) {
            try {
                return SimpleDateFormat(format, Locale.US).parse(value)
                    ?: throw IllegalArgumentException("Date is null")
            } catch (_: Exception) {
            }
        }
        throw IllegalArgumentException("Unsupported date format: $value")
    }

    private fun isSameInstant(currentValue: String?, nextValue: String?): Boolean {
        if (currentValue == null || nextValue == null) {
            return currentValue == nextValue
        }
        if (currentValue == nextValue) {
            return true
        }
        return try {
            parseIsoDate(currentValue).time == parseIsoDate(nextValue).time
        } catch (_: Exception) {
            false
        }
    }

    private fun formatTime(value: String): String {
        return if (value.length >= 16) value.substring(11, 16) else value
    }

    private fun getStatusLabel(context: Context, status: String): String {
        val resourceId = when (status) {
            "scheduled" -> R.string.notification_status_scheduled
            "checkin" -> R.string.notification_status_checkin
            "on_time" -> R.string.notification_status_on_time
            "gateclosed" -> R.string.notification_status_gateclosed
            "boarding" -> R.string.notification_status_boarding
            "delayed" -> R.string.notification_status_delayed
            "canceled" -> R.string.notification_status_canceled
            "departed" -> R.string.notification_status_departed
            "en_route" -> R.string.notification_status_en_route
            "arrived" -> R.string.notification_status_arrived
            "diverted" -> R.string.notification_status_diverted
            else -> R.string.notification_status_unknown
        }
        return context.getString(resourceId)
    }

    private fun showNotification(context: Context, flight: JSONObject, body: String, urgent: Boolean) {
        ensureNotificationChannels(context)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val contentIntent = launchIntent?.let {
            PendingIntent.getActivity(
                context,
                flight.optInt("flightId", 0),
                it.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
            )
        }

        val channelId = if (urgent) URGENT_CHANNEL_ID else FLIGHT_CHANNEL_ID
        val title = context.getString(
            R.string.notification_flight_title,
            flight.optString("airline"),
            flight.optString("flightNumber"),
        )

        val builder = NotificationCompat.Builder(context, channelId)
            .setAutoCancel(true)
            .setColor(ContextCompat.getColor(context, R.color.notification_icon_color))
            .setContentText(body)
            .setContentTitle(title)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setPriority(if (urgent) NotificationCompat.PRIORITY_MAX else NotificationCompat.PRIORITY_HIGH)
            .setSmallIcon(R.drawable.notification_icon)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))

        if (contentIntent != null) {
            builder.setContentIntent(contentIntent)
        }

        NotificationManagerCompat.from(context).notify(100000 + flight.optInt("flightId", 0), builder.build())
        Log.d("AirPlain", "Native notification sent for flight ${flight.optInt("flightId", 0)}")
    }

    private fun ensureNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (notificationManager.getNotificationChannel(FLIGHT_CHANNEL_ID) == null) {
            notificationManager.createNotificationChannel(
                NotificationChannel(
                    FLIGHT_CHANNEL_ID,
                    context.getString(R.string.notification_channel_flight),
                    NotificationManager.IMPORTANCE_HIGH,
                ).apply {
                    enableLights(true)
                    enableVibration(true)
                    lightColor = Color.RED
                }
            )
        }

        if (notificationManager.getNotificationChannel(URGENT_CHANNEL_ID) == null) {
            notificationManager.createNotificationChannel(
                NotificationChannel(
                    URGENT_CHANNEL_ID,
                    context.getString(R.string.notification_channel_urgent),
                    NotificationManager.IMPORTANCE_HIGH,
                ).apply {
                    enableLights(true)
                    enableVibration(true)
                    lightColor = Color.RED
                    vibrationPattern = longArrayOf(0, 250, 250, 250)
                }
            )
        }
    }
}