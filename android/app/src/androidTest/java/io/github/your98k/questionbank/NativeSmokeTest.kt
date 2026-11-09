package io.github.your98k.questionbank

import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isEnabled
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** Exercises real on-device startup and the bundled offline engine. No API request or key is used. */
@RunWith(AndroidJUnit4::class)
class NativeSmokeTest {
    @get:Rule
    val compose = createAndroidComposeRule<MainActivity>()

    @Test
    fun nativeStartupLocalPapersAndApiSettings() {
        compose.onNodeWithText("组卷台").assertIsDisplayed()
        compose.onNodeWithText("随时出题 · 随手练习").assertIsDisplayed()
        compose.onNodeWithText("本地出题 · 离线").assertIsDisplayed()

        generateLocalPaper()
        assertPaperPreview()

        compose.onNodeWithText("方程专项").performClick()
        scrollTo("方程专项训练")
        compose.onNodeWithText("方程专项训练").assertIsDisplayed()
        compose.onNodeWithText("本地出题 · 离线").assertIsDisplayed()
        generateLocalPaper()
        assertPaperPreview()

        compose.onNodeWithText("设置").performClick()
        scrollTo("个人 API 设置")
        compose.onNodeWithText("个人 API 设置").assertIsDisplayed()
        scrollTo("API 地址")
        compose.onNodeWithText("API 地址").assertIsDisplayed()
        scrollTo("模型 ID")
        compose.onNodeWithText("模型 ID").assertIsDisplayed()
        scrollTo("API Key / 代理访问口令")
        compose.onNodeWithText("API Key / 代理访问口令").assertIsDisplayed()
    }

    private fun generateLocalPaper() {
        scrollTo("生成练习")
        // Engine creation runs on Dispatchers.Default, so Compose idleness alone is insufficient.
        compose.waitUntil(timeoutMillis = 60_000) {
            compose.onAllNodes(hasText("生成练习") and isEnabled())
                .fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("生成练习").assertIsEnabled().performClick()
    }

    private fun assertPaperPreview() {
        compose.waitUntil(timeoutMillis = 60_000) {
            compose.onAllNodesWithText("试卷预览").fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("试卷预览").assertIsDisplayed()
        compose.onNodeWithText("共 10 题", substring = true).assertIsDisplayed()
        compose.onNodeWithText("本地题库", substring = true).assertIsDisplayed()
    }

    private fun scrollTo(text: String) {
        compose.onNode(SemanticsMatcher.keyIsDefined(SemanticsActions.ScrollToIndex))
            .performScrollToNode(hasText(text))
    }
}
