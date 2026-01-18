package com.mamenko.airplain

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import android.app.AlarmManager
import android.app.PendingIntent
import android.os.SystemClock
import android.os.PowerManager

class BgReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        var wakeLock: PowerManager.WakeLock? = null
        
        try {
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "AirPlain::BgTaskWakeLock"
            )
            wakeLock.acquire(5000)
            Log.d("AirPlain", "Wake lock acquired")
        } catch (e: SecurityException) {
            Log.w("AirPlain", "Wake lock permission denied, continuing without it")
        }

        try {
            val serviceIntent = Intent(context, BgTaskService::class.java)
            context.startService(serviceIntent)
            Log.d("AirPlain", "Service started")
        } catch (e: Exception) {
            Log.e("AirPlain", "Failed to start service", e)
        } finally {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intentReceiver = Intent(context, BgReceiver::class.java)
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                intentReceiver,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            Log.d("AirPlain", "startBackgroundTask from receiver")
            try {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    SystemClock.elapsedRealtime() + 60000,
                    pendingIntent
                )
            } catch (e: SecurityException) {
                Log.w("AirPlain", "Exact alarm permission denied, background task won't work")
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
            }, 5000)
        }
    }
}
