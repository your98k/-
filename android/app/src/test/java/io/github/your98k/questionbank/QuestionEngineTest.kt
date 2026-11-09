package io.github.your98k.questionbank

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QuestionEngineTest {
    private fun engine(): QuestionEngine {
        fun asset(name: String): String {
            val candidates = listOf("src/main/assets/$name", "app/src/main/assets/$name", "android/app/src/main/assets/$name")
            return candidates.map(::File).firstOrNull { it.isFile }?.readText(Charsets.UTF_8)
                ?: error("先运行 node tools/build-android-assets.js：缺少 $name")
        }
        return QuestionEngine(asset("question-bank.js"), asset("equation-bank.js"))
    }

    private fun spec(subject: String, stage: String, grade: Int, term: Int, equation: Boolean = false) =
        BuildSpec(subject = subject, stage = stage, grade = grade, term = term, count = 3,
            type = "choice", diffMin = 2, diffMax = 3, kps = emptyList(), equation = equation, ai = false)

    @Test fun supportedSubjectsGenerateWithTheRealRhinoRuntime() {
        val e = engine()
        for (s in listOf(spec("math", "primary", 5, 1), spec("math", "junior", 7, 1),
            spec("math", "senior", 10, 1), spec("physics", "junior", 8, 1),
            spec("chemistry", "junior", 9, 1), spec("english", "primary", 5, 1),
            spec("chinese", "primary", 5, 1))) {
            val allowed = e.topics(s).map { it.id }
            assertTrue("${s.subject} has supported topics", allowed.isNotEmpty())
            val paper = e.generate(s)
            assertEquals(3, paper.questions.size)
            assertTrue(paper.questions.all { it.kp in allowed && it.stem.isNotBlank() && it.answer.isNotBlank() })
            assertEquals("local", paper.source)
        }
    }

    @Test fun unavailableCurriculumDoesNotFallBackToAnotherGrade() {
        val e = engine()
        val empty = spec("english", "primary", 1, 1)
        assertTrue(e.topics(empty).isEmpty())
        try { e.generate(empty); throw AssertionError("Should reject empty curriculum") }
        catch (expected: IllegalArgumentException) { assertTrue(expected.message!!.contains("暂无本地")) }
    }

    @Test fun aiTopicsIncludeCurrentCurriculumWithoutLocalGenerators() {
        val e = engine()
        val s = spec("english", "primary", 6, 2)
        assertTrue(e.topics(s).isEmpty())
        assertTrue(e.topics(s.copy(ai = true)).any { it.id == "eng.p.read" })
    }

    @Test fun selectedTopicsMustBelongToCurrentCurriculum() {
        val e = engine()
        try { e.generate(spec("math", "primary", 5, 1).copy(kps = listOf("intAddSub"))); throw AssertionError("Should reject another grade") }
        catch (expected: IllegalArgumentException) { assertTrue(expected.message!!.contains("当前年级")) }
    }

    @Test fun equationFactoriesWorkAcrossStagesWithoutHtml() {
        val e = engine()
        for (s in listOf(spec("math", "primary", 5, 1, true), spec("math", "junior", 8, 1, true), spec("math", "senior", 10, 1, true))) {
            val paper = e.generate(s)
            assertEquals(3, paper.questions.size)
            assertEquals(3, paper.questions.map { it.stem }.distinct().size)
            assertFalse(paper.questions.any { it.stem.contains("<br") })
        }
    }
}
