package com.mamenko.airplain

import com.facebook.react.bridge.*
import android.content.Context
import android.content.Intent
import android.app.AlarmManager
import android.app.PendingIntent
import android.os.SystemClock
import android.util.Log
import android.os.PowerManager
import android.os.Build
import android.net.Uri
import android.provider.Settings

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
        
        try {
            Log.d("AirPlain", "startBackgroundTask")
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + 60000,
                pendingIntent
            )
        } catch (e: SecurityException) {
            Log.w("AirPlain", "Background task permission denied", e)
        } catch (e: Exception) {
            Log.e("AirPlain", "Failed to start background task", e)
        }
    }

    @ReactMethod
    fun stopBackgroundTask() {
        val context = reactApplicationContext
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, BgReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        Log.d("AirPlain", "stopBackgroundTask")
        alarmManager.cancel(pendingIntent)
    }

    @ReactMethod
    fun checkBatteryOptimization(promise: Promise) {
        val context = reactApplicationContext
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val packageName = context.packageName
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val isIgnoring = powerManager.isIgnoringBatteryOptimizations(packageName)
            promise.resolve(isIgnoring)
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val context = reactApplicationContext
            val intent = Intent()
            intent.action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
            intent.data = Uri.parse("package:${context.packageName}")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            
            try {
                context.startActivity(intent)
                Log.d("AirPlain", "Requesting battery optimization exemption")
            } catch (e: Exception) {
                Log.e("AirPlain", "Failed to request battery optimization exemption", e)
            }
        }
    }
}
