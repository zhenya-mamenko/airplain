package com.mamenko.airplain

import android.content.Context

object BackgroundStateStore {
    private const val PREFERENCES_NAME = "AirPlainBackgroundState"
    private const val KEY_CONFIG = "config_json"
    private const val KEY_FLIGHTS = "flights_json"
    private const val KEY_POLL_STATE = "poll_state_json"

    private fun getPreferences(context: Context) =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun setConfig(context: Context, configJson: String) {
        getPreferences(context).edit().putString(KEY_CONFIG, configJson).apply()
    }

    fun getConfig(context: Context): String {
        return getPreferences(context).getString(KEY_CONFIG, "{}") ?: "{}"
    }

    fun setFlights(context: Context, flightsJson: String) {
        getPreferences(context).edit().putString(KEY_FLIGHTS, flightsJson).apply()
    }

    fun getFlights(context: Context): String {
        return getPreferences(context).getString(KEY_FLIGHTS, "[]") ?: "[]"
    }

    fun setPollState(context: Context, pollStateJson: String) {
        getPreferences(context).edit().putString(KEY_POLL_STATE, pollStateJson).apply()
    }

    fun getPollState(context: Context): String {
        return getPreferences(context).getString(KEY_POLL_STATE, "{}") ?: "{}"
    }
}