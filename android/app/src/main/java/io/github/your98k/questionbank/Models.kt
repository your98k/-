package io.github.your98k.questionbank

data class BuildSpec(
    val subject: String = "math",
    val stage: String = "primary",
    val grade: Int = 5,
    val term: Int = 1,
    val count: Int = 10,
    val type: String = "choice",
    val diffMin: Int = 1,
    val diffMax: Int = 2,
    val kps: List<String> = emptyList(),
    val equation: Boolean = false,
    val ai: Boolean = false
)

data class Question(
    val id: String,
    val stem: String,
    val answer: String,
    val analysis: String,
    val opts: List<String> = emptyList(),
    val kp: String = "",
    val source: String = "local"
)

data class Paper(
    val title: String,
    val questions: List<Question>,
    val source: String = "local",
    val notice: String = ""
)

data class Topic(val id: String, val name: String)
data class ApiSettings(val baseUrl: String = "", val model: String = "", val apiKey: String = "")
