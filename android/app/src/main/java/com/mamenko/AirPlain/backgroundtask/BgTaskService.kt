package com.mamenko.AirPlain.backgroundtask

import android.content.Intent
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class BgTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent): HeadlessJsTaskConfig? {
        val bundle = Bundle()
        return HeadlessJsTaskConfig(
            "flightsCheckTask",
            bundle,
            0,
            false
        )
    }
}
