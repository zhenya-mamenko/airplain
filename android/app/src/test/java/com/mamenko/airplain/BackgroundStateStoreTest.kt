package com.mamenko.airplain

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(application = Application::class, sdk = [35])
class BackgroundStateStoreTest {
    private lateinit var context: Context

    @Before
    fun setUp() {
        context = ApplicationProvider.getApplicationContext()
        BackgroundStateStore.setConfig(context, "{}")
        BackgroundStateStore.setFlights(context, "[]")
        BackgroundStateStore.setPollState(context, "{}")
    }

    @Test
    fun returns_default_values_when_nothing_was_stored() {
        assertEquals("{}", BackgroundStateStore.getConfig(context))
        assertEquals("[]", BackgroundStateStore.getFlights(context))
        assertEquals("{}", BackgroundStateStore.getPollState(context))
    }

    @Test
    fun persists_and_reads_background_state_payloads() {
        BackgroundStateStore.setConfig(context, "{\"enabled\":true}")
        BackgroundStateStore.setFlights(context, "[{\"flightId\":7}]")
        BackgroundStateStore.setPollState(context, "{\"7\":{\"90m\":45}}")

        assertEquals("{\"enabled\":true}", BackgroundStateStore.getConfig(context))
        assertEquals("[{\"flightId\":7}]", BackgroundStateStore.getFlights(context))
        assertEquals("{\"7\":{\"90m\":45}}", BackgroundStateStore.getPollState(context))
    }
}
