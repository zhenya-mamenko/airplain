package com.mamenko.airplain

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import android.app.AlarmManager
import android.app.PendingIntent
import android.os.SystemClock

class BgReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val serviceIntent = Intent(context, BgTaskService::class.java)
        context.startService(serviceIntent)

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intentReceiver = Intent(context, BgReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(context, 0, intentReceiver, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        Log.d("AirPlain", "startBackgroundTask from receiver (AirPlain)")
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 60000,
            pendingIntent
        )
    }
}
