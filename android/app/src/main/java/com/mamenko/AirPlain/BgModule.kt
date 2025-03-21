package com.mamenko.airplain

import com.facebook.react.bridge.*
import android.content.Context
import android.content.Intent
import android.app.AlarmManager
import android.app.PendingIntent
import android.os.SystemClock
import android.util.Log

class AirPlainBgModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AirPlainBgModule"
    }

    @ReactMethod
    fun startBackgroundTask() {
        val context = reactApplicationContext
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, BgReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        Log.d("AirPlain", "startBackgroundTask (AirPlain)")
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 60000,
            pendingIntent
        )
    }

    @ReactMethod
    fun stopBackgroundTask() {
        val context = reactApplicationContext
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, BgReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        Log.d("AirPlain", "stopBackgroundTask (AirPlain)")
        alarmManager.cancel(pendingIntent)
    }
}
