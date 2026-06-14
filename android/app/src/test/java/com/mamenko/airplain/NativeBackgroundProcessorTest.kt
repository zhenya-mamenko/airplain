package com.mamenko.airplain

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.text.SimpleDateFormat
import java.time.Instant
import java.util.Date
import java.util.Locale
import kotlin.math.ceil

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [35])
class NativeBackgroundProcessorTest {
    private lateinit var context: Context

    private data class DeliveredNotification(
        val body: String,
        val flightId: Int,
        val urgent: Boolean,
    )

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        BackgroundStateStore.setConfig(context, "{}")
        BackgroundStateStore.setFlights(context, "[]")
        BackgroundStateStore.setPollState(context, "{}")
        NativeBackgroundProcessor.resetTestHooks()
        NativeBackgroundProcessor.foregroundChecker = { false }
    }

    @After
    fun tearDown() {
        NativeBackgroundProcessor.resetTestHooks()
        BackgroundStateStore.setConfig(context, "{}")
        BackgroundStateStore.setFlights(context, "[]")
        BackgroundStateStore.setPollState(context, "{}")
    }

    @Test
    fun process_updates_snapshot_poll_state_and_emits_urgent_notification_for_scheduled_changes() {
        val now = System.currentTimeMillis()
        val startMillis = now + 45 * 60 * 1000L
        val expectedMinutes = ceil((startMillis - now) / 60000.0).toInt()
        val startIso = Instant.ofEpochMilli(startMillis).toString()
        val endIso = Instant.ofEpochMilli(now + 8 * 60 * 60 * 1000L).toString()
        BackgroundStateStore.setConfig(
            context,
            JSONObject()
                .put("enabled", true)
                .put("currentApi", "aerodatabox")
                .toString(),
        )
        BackgroundStateStore.setFlights(context, JSONArray().put(createFlight(startIso, endIso)).toString())
        BackgroundStateStore.setPollState(
            context,
            JSONObject().put("7", JSONObject().put("90m", expectedMinutes + 5)).toString(),
        )

        var deliveredNotification: DeliveredNotification? = null
        NativeBackgroundProcessor.flightDataFetcher = { _, _ ->
            NativeBackgroundProcessor.ApiFlightData(
                actualEndDatetime = null,
                actualStartDatetime = null,
                arrivalTerminal = null,
                baggageBelt = null,
                departureCheckInDesk = null,
                departureGate = "C4",
                departureTerminal = null,
                status = "delayed",
                success = true,
            )
        }
        NativeBackgroundProcessor.notificationSender = { _, flight, body, urgent ->
            deliveredNotification = DeliveredNotification(
                body = body,
                flightId = flight.optInt("flightId"),
                urgent = urgent,
            )
        }

        NativeBackgroundProcessor.process(context)

        val updatedFlight = JSONArray(BackgroundStateStore.getFlights(context)).getJSONObject(0)
        assertEquals("delayed", updatedFlight.getString("status"))
        assertEquals("C4", updatedFlight.getString("departureGate"))

        val pollState = JSONObject(BackgroundStateStore.getPollState(context))
        assertEquals(expectedMinutes, pollState.getJSONObject("7").getInt("90m"))

        assertNotNull(deliveredNotification)
        assertEquals(7, deliveredNotification?.flightId)
        assertTrue(deliveredNotification?.urgent == true)
        assertTrue(deliveredNotification?.body?.contains("Status was changed, new status is delayed.") == true)
        assertTrue(deliveredNotification?.body?.contains("Departure gate was changed, new gate is C4.") == true)
    }

    @Test
    fun process_seeds_missing_bucket_and_skips_immediate_fetch() {
        val now = System.currentTimeMillis()
        val startMillis = now + 45 * 60 * 1000L
        val expectedMinutes = ceil((startMillis - now) / 60000.0).toInt()
        val startIso = Instant.ofEpochMilli(startMillis).toString()
        val endIso = Instant.ofEpochMilli(now + 8 * 60 * 60 * 1000L).toString()
        BackgroundStateStore.setConfig(
            context,
            JSONObject()
                .put("enabled", true)
                .put("currentApi", "aerodatabox")
                .toString(),
        )
        BackgroundStateStore.setFlights(context, JSONArray().put(createFlight(startIso, endIso)).toString())

        var fetchCount = 0
        var notificationCount = 0
        NativeBackgroundProcessor.flightDataFetcher = { _, _ ->
            fetchCount += 1
            NativeBackgroundProcessor.ApiFlightData(
                actualEndDatetime = null,
                actualStartDatetime = null,
                arrivalTerminal = null,
                baggageBelt = null,
                departureCheckInDesk = null,
                departureGate = "C4",
                departureTerminal = null,
                status = "delayed",
                success = true,
            )
        }
        NativeBackgroundProcessor.notificationSender = { _, _, _, _ ->
            notificationCount += 1
        }

        NativeBackgroundProcessor.process(context)

        val unchangedFlight = JSONArray(BackgroundStateStore.getFlights(context)).getJSONObject(0)
        assertEquals("scheduled", unchangedFlight.getString("status"))
        assertFalse(unchangedFlight.has("departureGate"))

        val pollState = JSONObject(BackgroundStateStore.getPollState(context))
        assertEquals(expectedMinutes, pollState.getJSONObject("7").getInt("90m"))

        assertEquals(0, fetchCount)
        assertEquals(0, notificationCount)
    }

    @Test
    fun process_skips_duplicate_poll_bucket_without_fetching_or_notifying() {
        val now = System.currentTimeMillis()
        val startMillis = now + 45 * 60 * 1000L
        val expectedMinutes = ceil((startMillis - now) / 60000.0).toInt()
        val startIso = Instant.ofEpochMilli(startMillis).toString()
        val endIso = Instant.ofEpochMilli(now + 8 * 60 * 60 * 1000L).toString()
        BackgroundStateStore.setConfig(
            context,
            JSONObject()
                .put("enabled", true)
                .put("currentApi", "aerodatabox")
                .toString(),
        )
        BackgroundStateStore.setFlights(context, JSONArray().put(createFlight(startIso, endIso)).toString())
        BackgroundStateStore.setPollState(
            context,
            JSONObject().put("7", JSONObject().put("90m", expectedMinutes)).toString(),
        )

        var fetchCount = 0
        var notificationCount = 0
        NativeBackgroundProcessor.flightDataFetcher = { _, _ ->
            fetchCount += 1
            NativeBackgroundProcessor.ApiFlightData(
                actualEndDatetime = null,
                actualStartDatetime = null,
                arrivalTerminal = null,
                baggageBelt = null,
                departureCheckInDesk = null,
                departureGate = "C4",
                departureTerminal = null,
                status = "delayed",
                success = true,
            )
        }
        NativeBackgroundProcessor.notificationSender = { _, _, _, _ ->
            notificationCount += 1
        }

        NativeBackgroundProcessor.process(context)

        val unchangedFlight = JSONArray(BackgroundStateStore.getFlights(context)).getJSONObject(0)
        assertEquals("scheduled", unchangedFlight.getString("status"))
        assertFalse(unchangedFlight.has("departureGate"))
        assertEquals(0, fetchCount)
        assertEquals(0, notificationCount)
    }

    @Test
    fun process_accepts_space_separated_offset_datetimes_from_snapshot() {
        val now = System.currentTimeMillis()
        val startMillis = now + 45 * 60 * 1000L
        val expectedMinutes = ceil((startMillis - now) / 60000.0).toInt()
        val startValue = formatSnapshotDate(startMillis)
        val endValue = formatSnapshotDate(now + 8 * 60 * 60 * 1000L)
        BackgroundStateStore.setConfig(
            context,
            JSONObject()
                .put("enabled", true)
                .put("currentApi", "aerodatabox")
                .toString(),
        )
        BackgroundStateStore.setFlights(context, JSONArray().put(createFlight(startValue, endValue)).toString())
        BackgroundStateStore.setPollState(
            context,
            JSONObject().put("7", JSONObject().put("90m", expectedMinutes + 5)).toString(),
        )

        var fetchCount = 0
        NativeBackgroundProcessor.flightDataFetcher = { _, _ ->
            fetchCount += 1
            NativeBackgroundProcessor.ApiFlightData(
                actualEndDatetime = null,
                actualStartDatetime = null,
                arrivalTerminal = null,
                baggageBelt = null,
                departureCheckInDesk = null,
                departureGate = "C4",
                departureTerminal = null,
                status = "delayed",
                success = true,
            )
        }

        NativeBackgroundProcessor.process(context)

        val updatedFlight = JSONArray(BackgroundStateStore.getFlights(context)).getJSONObject(0)
        assertEquals("delayed", updatedFlight.getString("status"))
        assertEquals("C4", updatedFlight.getString("departureGate"))
        assertEquals(1, fetchCount)
    }

    @Test
    fun process_does_not_notify_when_datetimes_match_as_same_instant_with_different_offsets() {
        val now = System.currentTimeMillis()
        val startMillis = now + 45 * 60 * 1000L
        val startValue = formatSnapshotDate(startMillis)
        val endValue = formatSnapshotDate(now + 8 * 60 * 60 * 1000L)
        BackgroundStateStore.setConfig(
            context,
            JSONObject()
                .put("enabled", true)
                .put("currentApi", "aeroapi")
                .toString(),
        )
        BackgroundStateStore.setFlights(
            context,
            JSONArray().put(
                createFlight(startValue, endValue)
                    .put("actualStartDatetime", startValue),
            ).toString(),
        )

        var notificationCount = 0
        NativeBackgroundProcessor.flightDataFetcher = { _, _ ->
            NativeBackgroundProcessor.ApiFlightData(
                actualEndDatetime = null,
                actualStartDatetime = toUtcIso(startValue),
                arrivalTerminal = null,
                baggageBelt = null,
                departureCheckInDesk = null,
                departureGate = null,
                departureTerminal = null,
                status = null,
                success = true,
            )
        }
        NativeBackgroundProcessor.notificationSender = { _, _, _, _ ->
            notificationCount += 1
        }

        NativeBackgroundProcessor.process(context)

        val updatedFlight = JSONArray(BackgroundStateStore.getFlights(context)).getJSONObject(0)
        assertEquals(startValue, updatedFlight.getString("actualStartDatetime"))
        assertEquals(0, notificationCount)
    }

    @Test
    fun fromUtcToLocalIsoString_matches_js_snapshot_format() {
        assertEquals(
            "2026-06-14 12:15:30+02:00",
            NativeBackgroundProcessor.fromUtcToLocalIsoString("2026-06-14T10:15:30Z", "Europe/Paris"),
        )
        assertEquals(
            "2026-12-14 11:15:30+01:00",
            NativeBackgroundProcessor.fromUtcToLocalIsoString("2026-12-14T10:15:30Z", "Europe/Paris"),
        )
    }

    private fun createFlight(startIso: String, endIso: String): JSONObject {
        return JSONObject()
            .put("airline", "BA")
            .put("arrivalAirportTimezone", "Europe/Paris")
            .put("endDatetime", endIso)
            .put("departureAirportTimezone", "Europe/Paris")
            .put("flightId", 7)
            .put("flightNumber", "123")
            .put("isArchived", false)
            .put("recordType", 1)
            .put("startDatetime", startIso)
            .put("status", "scheduled")
    }

    private fun formatSnapshotDate(value: Long): String {
        return SimpleDateFormat("yyyy-MM-dd HH:mm:ssXXX", Locale.US).format(Date(value))
    }

    private fun toUtcIso(value: String): String {
        return Instant.ofEpochMilli(SimpleDateFormat("yyyy-MM-dd HH:mm:ssXXX", Locale.US).parse(value)!!.time).toString()
    }
}
