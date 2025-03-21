package com.mamenko.airplain

import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.bridge.Arguments
import android.util.Log

class BgTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
        Log.d("AirPlain", "getTaskConfig (AirPlain)")
        return intent.extras?.let {
            HeadlessJsTaskConfig(
                "flightsCheckTask",
                Arguments.fromBundle(it),
                5000,
                false
            )
        }
    }
}
