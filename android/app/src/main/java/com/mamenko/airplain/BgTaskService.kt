package com.mamenko.airplain

import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.bridge.Arguments
import android.util.Log

class BgTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
        Log.d("AirPlain", "getTaskConfig")
        val extras = intent.extras
        val data = if (extras != null) Arguments.fromBundle(extras) else Arguments.createMap()
        return HeadlessJsTaskConfig(
            "flightsCheckTask",
            data,
            5000,
            true
        )
    }
}
