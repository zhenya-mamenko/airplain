package com.mamenko.airplain

import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.bridge.Arguments
import android.util.Log

class BgTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        Log.d("AirPlain", "getTaskConfig")
        val bundle = Bundle(intent?.extras ?: Bundle())
        bundle.putString("executionMode", "headless")
        val data = Arguments.fromBundle(bundle)
        return HeadlessJsTaskConfig(
            "flightsCheckTask",
            data,
            5000,
            true
        )
    }
}
