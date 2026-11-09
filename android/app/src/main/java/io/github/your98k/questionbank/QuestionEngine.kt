package io.github.your98k.questionbank

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import org.mozilla.javascript.Context
import org.mozilla.javascript.ContextFactory
import org.mozilla.javascript.Function
import org.mozilla.javascript.Scriptable
import org.mozilla.javascript.ScriptableObject

/** Pure local question computation. This class does not render pages or expose Android/Java to JS. */
class QuestionEngine(private val bundle: String, private val equations: String) {
    private val gson = Gson()
    private val lock = Any()
    private var scope: ScriptableObject? = null
    private val deadline = ThreadLocal<Long>()
    private val factory = object : ContextFactory() {
        override fun makeContext(): Context = super.makeContext().apply {
            languageVersion = Context.VERSION_ES6
            optimizationLevel = -1
            instructionObserverThreshold = 10_000
            setClassShutter { false }
        }

        override fun observeInstructionCount(context: Context, instructionCount: Int) {
            if (System.nanoTime() > (deadline.get() ?: Long.MAX_VALUE)) {
                throw IllegalStateException("本地出题超时，请减少题量后重试")
            }
        }
    }

    fun topics(spec: BuildSpec): List<Topic> {
        if (spec.equation) return listOf(Topic("equation", "解方程"))
        val json = invoke("NativeQuestionBank", "topicsJson", spec)
        return gson.fromJson(json, object : TypeToken<List<Topic>>() {}.type)
    }

    fun generate(spec: BuildSpec): Paper = gson.fromJson(
        invoke(if (spec.equation) "NativeEquationBank" else "NativeQuestionBank", "generateJson", spec),
        Paper::class.java
    )

    private fun invoke(namespace: String, method: String, spec: BuildSpec): String = synchronized(lock) {
        deadline.set(System.nanoTime() + 8_000_000_000L)
        val context = factory.enterContext()
        try {
            val runtime = scope ?: context.initSafeStandardObjects().also {
                context.evaluateString(it, bundle, "question-bank.js", 1, null)
                context.evaluateString(it, equations, "equation-bank.js", 1, null)
                scope = it
            }
            val api = ScriptableObject.getProperty(runtime, namespace) as? Scriptable
                ?: error("本地题库未加载")
            val function = ScriptableObject.getProperty(api, method) as? Function
                ?: error("本地题库接口不存在")
            Context.toString(function.call(context, runtime, api, arrayOf(gson.toJson(spec))))
        } catch (failure: org.mozilla.javascript.JavaScriptException) {
            throw IllegalArgumentException(Context.toString(failure.value).removePrefix("Error: ").take(300))
        } finally {
            Context.exit()
            deadline.remove()
        }
    }
}
