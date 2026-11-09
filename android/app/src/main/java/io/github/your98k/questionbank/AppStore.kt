package io.github.your98k.questionbank

import android.content.Context
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/** Device-local records. API credentials are deliberately excluded from persistence. */
class AppStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences("question-bank", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun readSettings() = ApiSettings(
        baseUrl = preferences.getString("api-base", "") ?: "",
        model = preferences.getString("api-model", "") ?: "",
        apiKey = ""
    )

    fun saveSettings(settings: ApiSettings) {
        val values = persistentValues(settings)
        preferences.edit().putString("api-base", values.getValue("baseUrl")).putString("api-model", values.getValue("model")).remove("api-key").apply()
    }

    fun loadMistakes(): List<Question> = try {
        val type = object : TypeToken<List<Question>>() {}.type
        val list: List<Question> = gson.fromJson(preferences.getString("mistakes", "[]"), type) ?: emptyList()
        list.takeLast(500)
    } catch (_: Exception) { emptyList() }

    fun saveMistakes(list: List<Question>) {
        preferences.edit().putString("mistakes", gson.toJson(list.distinctBy { it.stem + it.answer }.takeLast(500))).apply()
    }

    fun loadPaper(): Paper? = try {
        gson.fromJson(preferences.getString("paper", null), Paper::class.java)
    } catch (_: Exception) { null }

    fun savePaper(paper: Paper) {
        preferences.edit().putString("paper", gson.toJson(paper)).apply()
    }

    fun clearAll() {
        preferences.edit().clear().apply()
    }

    companion object {
        internal fun persistentValues(settings: ApiSettings): Map<String, String> {
            val safe = if (settings.apiKey.isBlank()) settings else AiClient.validate(settings)
            return mapOf("baseUrl" to safe.baseUrl.take(500), "model" to safe.model.take(160))
        }
    }
}
