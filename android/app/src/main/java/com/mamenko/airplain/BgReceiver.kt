package com.mamenko.airplain

import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import android.app.AlarmManager
import android.app.PendingIntent
import android.os.SystemClock
import android.os.PowerManager
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread

class BgReceiver : BroadcastReceiver() {
    companion object {
        private const val ACTION_RUN_BACKGROUND_TASK = "com.mamenko.airplain.action.RUN_BACKGROUND_TASK"
        private const val PREFERENCES_NAME = "AirPlainBackgroundTask"
        private const val PREFERENCE_ENABLED = "enabled"
        private const val INTERVAL_MS = 60000L

        internal var backgroundTaskEnabledChecker: (Context) -> Boolean = { context -> isBackgroundTaskEnabled(context) }
        internal var nextRunScheduler: (Context) -> Unit = { context -> scheduleNextRun(context) }
        internal var processorLauncher: (Context) -> Unit = { context ->
            thread(start = true, name = "AirPlainNativeBackgroundProcessor") {
                try {
                    NativeBackgroundProcessor.process(context.applicationContext)
                } catch (e: Exception) {
                    Log.e("AirPlain", "Native background processor failed", e)
                }
            }
        }
        internal var serviceStarter: (Context) -> Unit = { context ->
            HeadlessJsTaskService.acquireWakeLockNow(context)
            val serviceIntent = Intent(context, BgTaskService::class.java)
            context.startService(serviceIntent)
            Log.d("AirPlain", "Service started")
        }

        internal fun resetTestHooks() {
            backgroundTaskEnabledChecker = { context -> isBackgroundTaskEnabled(context) }
            nextRunScheduler = { context -> scheduleNextRun(context) }
            processorLauncher = { context ->
                thread(start = true, name = "AirPlainNativeBackgroundProcessor") {
                    try {
                        NativeBackgroundProcessor.process(context.applicationContext)
                    } catch (e: Exception) {
                        Log.e("AirPlain", "Native background processor failed", e)
                    }
                }
            }
            serviceStarter = { context ->
                HeadlessJsTaskService.acquireWakeLockNow(context)
                val serviceIntent = Intent(context, BgTaskService::class.java)
                context.startService(serviceIntent)
                Log.d("AirPlain", "Service started")
            }
        }

        fun createRunIntent(context: Context): Intent {
            return Intent(context, BgReceiver::class.java).apply {
                action = ACTION_RUN_BACKGROUND_TASK
            }
        }

        fun setBackgroundTaskEnabled(context: Context, enabled: Boolean) {
            context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .edit()
                .putBoolean(PREFERENCE_ENABLED, enabled)
                .apply()
        }

        fun isBackgroundTaskEnabled(context: Context): Boolean {
            return context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
                .getBoolean(PREFERENCE_ENABLED, false)
        }

        fun scheduleNextRun(context: Context) {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                createRunIntent(context),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            try {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + INTERVAL_MS,
                    pendingIntent
                )
                Log.d("AirPlain", "Next background task scheduled")
            } catch (e: SecurityException) {
                Log.w("AirPlain", "Exact alarm permission denied, background task won't work", e)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            if (backgroundTaskEnabledChecker(context)) {
                Log.d("AirPlain", "BOOT_COMPLETED received; restoring background cycle")
                nextRunScheduler(context)
            } else {
                Log.d("AirPlain", "BOOT_COMPLETED received; background cycle is disabled")
            }
            return
        }

        var wakeLock: PowerManager.WakeLock? = null

        try {
            val configJson = BackgroundStateStore.getConfig(context)
            val flightsJson = BackgroundStateStore.getFlights(context)
            val config = JSONObject(configJson)
            val flights = JSONArray(flightsJson)
            Log.d(
                "AirPlain",
                "Background snapshot loaded: enabled=${config.optBoolean("enabled", false)}, api=${config.optString("currentApi", "")}, flights=${flights.length()}"
            )
        } catch (e: Exception) {
            Log.w("AirPlain", "Failed to read background snapshot", e)
        }
        
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "AirPlain::BgTaskWakeLock"
            )
            wakeLock.acquire(15000)
            Log.d("AirPlain", "Wake lock acquired")
        } catch (e: SecurityException) {
            Log.w("AirPlain", "Wake lock permission denied, continuing without it")
        }

        processorLauncher(context.applicationContext)

        try {
            serviceStarter(context)
        } catch (e: SecurityException) {
            Log.e("AirPlain", "Failed to start service due to manifest/service permission issue", e)
        } catch (e: IllegalStateException) {
            Log.e("AirPlain", "Failed to start service while app is background-restricted", e)
        } catch (e: ActivityNotFoundException) {
            Log.e("AirPlain", "Failed to start service because component was not found", e)
        } catch (e: Exception) {
            Log.e("AirPlain", "Failed to start service", e)
        } finally {
            if (backgroundTaskEnabledChecker(context)) {
                Log.d("AirPlain", "startBackgroundTask from receiver")
                nextRunScheduler(context)
            }
            
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                try {
                    if (wakeLock?.isHeld == true) {
                        wakeLock.release()
                        Log.d("AirPlain", "Wake lock released")
                    }
                } catch (e: Exception) {
                    Log.e("AirPlain", "Error releasing wake lock", e)
                }
            }, 15000)
        }
    }
}
