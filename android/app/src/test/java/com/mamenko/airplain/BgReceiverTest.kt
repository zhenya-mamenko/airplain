package com.mamenko.airplain

import android.app.AlarmManager
import android.app.Application
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject
import androidx.test.core.app.ApplicationProvider
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [36])
class BgReceiverTest {
    private lateinit var context: Context

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        BgReceiver.resetTestHooks()
        BgReceiver.setBackgroundTaskEnabled(context, false)
    }

    @After
    fun tearDown() {
        BgReceiver.resetTestHooks()
        BgReceiver.setBackgroundTaskEnabled(context, false)
    }

    @Test
    fun onReceive_runs_processor_starts_service_and_reschedules_when_enabled() {
        BackgroundStateStore.setConfig(context, JSONObject().put("enabled", true).toString())
        BackgroundStateStore.setFlights(context, JSONArray().toString())

        var processCalls = 0
        var serviceCalls = 0
        var scheduleCalls = 0
        BgReceiver.processorLauncher = {
            processCalls += 1
        }
        BgReceiver.serviceStarter = {
            serviceCalls += 1
        }
        BgReceiver.nextRunScheduler = {
            scheduleCalls += 1
        }
        BgReceiver.backgroundTaskEnabledChecker = { true }
        BgReceiver.setBackgroundTaskEnabled(context, true)

        BgReceiver().onReceive(context, BgReceiver.createRunIntent(context))

        assertEquals(1, processCalls)
        assertEquals(1, serviceCalls)
        assertEquals(1, scheduleCalls)
    }

    @Test
    fun onReceive_does_not_reschedule_when_disabled() {
        BackgroundStateStore.setConfig(context, JSONObject().put("enabled", false).toString())
        BackgroundStateStore.setFlights(context, JSONArray().toString())

        var processCalls = 0
        var serviceCalls = 0
        var scheduleCalls = 0
        BgReceiver.processorLauncher = {
            processCalls += 1
        }
        BgReceiver.serviceStarter = {
            serviceCalls += 1
        }
        BgReceiver.nextRunScheduler = {
            scheduleCalls += 1
        }
        BgReceiver.backgroundTaskEnabledChecker = { false }
        BgReceiver.setBackgroundTaskEnabled(context, false)

        BgReceiver().onReceive(context, BgReceiver.createRunIntent(context))

        assertEquals(1, processCalls)
        assertEquals(1, serviceCalls)
        assertEquals(0, scheduleCalls)
    }

    @Test
    fun onReceive_starts_real_service_and_schedules_real_alarm_when_enabled() {
        BackgroundStateStore.setConfig(context, JSONObject().put("enabled", true).toString())
        BackgroundStateStore.setFlights(context, JSONArray().toString())

        var processCalls = 0
        BgReceiver.processorLauncher = {
            processCalls += 1
        }
        BgReceiver.backgroundTaskEnabledChecker = { true }
        BgReceiver.setBackgroundTaskEnabled(context, true)

        BgReceiver().onReceive(context, BgReceiver.createRunIntent(context))

        assertEquals(1, processCalls)

        val shadowApplication = shadowOf(context as Application)
        val startedService = shadowApplication.nextStartedService
        assertEquals(BgTaskService::class.java.name, startedService.component?.className)

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val nextAlarm = shadowOf(alarmManager).nextScheduledAlarm
        assertNotNull(nextAlarm)
        assertEquals(AlarmManager.ELAPSED_REALTIME_WAKEUP, nextAlarm!!.type)

        val scheduledIntent = shadowOf(nextAlarm.operation).savedIntent
        assertEquals(BgReceiver::class.java.name, scheduledIntent.component?.className)
        assertEquals(BgReceiver.createRunIntent(context).action, scheduledIntent.action)
    }

    @Test
    fun onReceive_restores_background_cycle_after_boot_when_enabled() {
        var scheduleCalls = 0
        BgReceiver.nextRunScheduler = {
            scheduleCalls += 1
        }
        BgReceiver.setBackgroundTaskEnabled(context, true)

        BgReceiver().onReceive(context, Intent(Intent.ACTION_BOOT_COMPLETED))

        assertEquals(1, scheduleCalls)
    }

    @Test
    fun onReceive_skips_restore_after_boot_when_disabled() {
        var scheduleCalls = 0
        BgReceiver.nextRunScheduler = {
            scheduleCalls += 1
        }
        BgReceiver.setBackgroundTaskEnabled(context, false)

        BgReceiver().onReceive(context, Intent(Intent.ACTION_BOOT_COMPLETED))

        assertEquals(0, scheduleCalls)
    }

    @Test
    fun background_task_enabled_flag_round_trips_through_preferences() {
        assertFalse(BgReceiver.isBackgroundTaskEnabled(context))

        BgReceiver.setBackgroundTaskEnabled(context, true)
        assertTrue(BgReceiver.isBackgroundTaskEnabled(context))

        BgReceiver.setBackgroundTaskEnabled(context, false)
        assertFalse(BgReceiver.isBackgroundTaskEnabled(context))
    }
}
