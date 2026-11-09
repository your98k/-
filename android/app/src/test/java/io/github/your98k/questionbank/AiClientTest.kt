package io.github.your98k.questionbank

import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class AiClientTest {
    private val token = "fixture-access-token"
    private val spec = BuildSpec(equation = true)

    private fun response(stem: String = "x + 2 = 5", answer: String = "x = 3", analysis: String = "两边同时减去2") = Gson().toJson(mapOf(
        "choices" to listOf(mapOf("finish_reason" to "stop", "message" to mapOf("content" to Gson().toJson(mapOf(
            "questions" to listOf(mapOf("stem" to stem, "answer" to answer, "analysis" to analysis, "opts" to emptyList<String>()))
        )))))
    ))

    @Test fun normalizesEndpointWithoutPersistingCredentials() {
        val value = AiClient.validate(ApiSettings("https://example.com/v1/chat/completions/", " model ", token))
        assertEquals("https://example.com/v1", value.baseUrl)
        assertEquals("model", value.model)
        assertFalse(value.baseUrl.contains(token))
    }

    @Test fun refusesInsecureOrCredentialBearingAddresses() {
        val encoded = token.map { "%%%02x".format(it.code) }.joinToString("")
        for (address in listOf("http://example.com/v1", "https://user:pass@example.com/v1", "https://example.com/v1?key=x", "https://example.com/$token", "https://example.com/$encoded", "https://example.com/${encoded.replace("%", "%25")}")) {
            assertThrows(IllegalArgumentException::class.java) { AiClient.validate(ApiSettings(address, "model", token)) }
        }
    }

    @Test fun persistedSettingsExcludeAllCredentialFields() {
        val values = AppStore.persistentValues(ApiSettings("https://example.com/v1", "model", token))
        assertEquals(setOf("baseUrl", "model"), values.keys)
        assertTrue(values.values.none { it.contains(token) })
        assertThrows(IllegalArgumentException::class.java) {
            AppStore.persistentValues(ApiSettings("https://example.com/$token", "model", token))
        }
    }

    @Test fun parsesNativeEquationAndRejectsSecretEchoOrMarkup() {
        val questions = AiClient.parseQuestions(response(), spec, emptyList(), token, 1)
        assertEquals("x + 2 = 5", questions.single().stem)
        assertEquals("ai", questions.single().source)
        assertThrows(IllegalArgumentException::class.java) { AiClient.parseQuestions(response(answer = token), spec, emptyList(), token, 1) }
        assertThrows(IllegalArgumentException::class.java) { AiClient.parseQuestions(response(stem = "<img src=x> x = 3"), spec, emptyList(), token, 1) }
        assertThrows(IllegalArgumentException::class.java) { AiClient.parseQuestions(response(stem = "计算 1 + 1"), spec, emptyList(), token, 1) }
    }

    @Test fun rejectsWrongCountAndNormalizesDuplicateFingerprint() {
        assertThrows(IllegalArgumentException::class.java) { AiClient.parseQuestions(response(), spec, emptyList(), token, 2) }
        assertEquals(AiClient.fingerprint("ｘ ＋ ２ ＝ ５"), AiClient.fingerprint("x+2=5"))
    }
}
