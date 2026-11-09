package io.github.your98k.questionbank

import android.app.Application
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val scheme = if (isSystemInDarkTheme()) darkColorScheme(primary = Color(0xFF79D7BD))
            else lightColorScheme(primary = Color(0xFF0E6B5C), secondary = Color(0xFF47685E))
            MaterialTheme(colorScheme = scheme) { QuestionBankApp() }
        }
    }
}

class BankViewModel(application: Application) : AndroidViewModel(application) {
    private val store = AppStore(application)
    private val ai = AiClient()
    private var engine: QuestionEngine? = null
    private var generation: Job? = null
    var spec by mutableStateOf(BuildSpec()); private set
    var topics by mutableStateOf<List<Topic>>(emptyList()); private set
    var ready by mutableStateOf(false); private set
    var busy by mutableStateOf(false); private set
    var message by mutableStateOf(""); private set
    var paper by mutableStateOf(store.loadPaper()); private set
    var mistakes by mutableStateOf(store.loadMistakes()); private set
    var settings by mutableStateOf(store.readSettings()); private set
    var preview by mutableStateOf(false)

    init {
        viewModelScope.launch {
            try {
                engine = withContext(Dispatchers.Default) {
                    val assets = application.assets
                    QuestionEngine(assets.open("question-bank.js").bufferedReader().use { it.readText() },
                        assets.open("equation-bank.js").bufferedReader().use { it.readText() })
                }
                ready = true
                refreshTopics()
            } catch (_: Exception) { message = "离线题库加载失败，请重新启动或安装最新版本。" }
        }
    }

    fun update(next: BuildSpec) {
        if (busy) return
        spec = next.copy(count = next.count.coerceIn(1, 100), diffMin = next.diffMin.coerceIn(1, 5), diffMax = next.diffMax.coerceIn(1, 5))
        refreshTopics()
    }

    private var topicJob: Job? = null
    private fun refreshTopics() {
        if (!ready) return
        val requested = spec
        topicJob?.cancel()
        topicJob = viewModelScope.launch {
            val result = try { withContext(Dispatchers.Default) { engine!!.topics(requested) } }
            catch (e: CancellationException) { throw e }
            catch (_: Exception) { emptyList() }
            if (spec == requested) topics = result
        }
    }

    fun generate() {
        if (busy || !ready) return
        val requested = spec
        if (requested.ai && requested.count > 40) { message = "AI 每份练习最多 40 题，请减少题量。"; return }
        if (requested.ai && settings.apiKey.isBlank()) { message = "请到设置填写 API 地址、模型和访问口令。"; return }
        busy = true
        message = if (requested.ai) "正在生成，原试卷暂时保留…" else "正在生成离线练习…"
        generation = viewModelScope.launch {
            try {
                val currentTopics = withContext(Dispatchers.Default) { engine!!.topics(requested) }
                val result = if (requested.ai) ai.generate(requested, currentTopics, settings,
                    paper?.questions?.map { it.stem }.orEmpty()) { done, total -> message = "AI 已完成 $done / $total 题" }
                else withContext(Dispatchers.Default) { engine!!.generate(requested) }
                paper = result
                withContext(Dispatchers.IO) { store.savePaper(result) }
                preview = true
                message = result.notice
            } catch (e: CancellationException) { message = "已取消生成，原试卷保留。"; throw e }
            catch (e: Exception) { message = if (requested.ai) "AI 生成失败：${e.message}" else (e.message ?: "未能生成题目，请调整条件。") }
            finally { busy = false }
        }
    }

    fun cancel() { generation?.cancel() }
    fun saveSettings(next: ApiSettings) {
        try {
            val validated = AiClient.validate(next)
            store.saveSettings(validated)
            settings = validated
            message = "已保存地址和模型；访问口令仅保留到应用进程结束。"
        } catch (e: IllegalArgumentException) { message = e.message ?: "请检查接口设置。" }
    }
    fun clearKey() { settings = settings.copy(apiKey = ""); message = "已清除当前运行中的访问口令。" }
    fun clearAll() {
        cancel(); store.clearAll(); settings = ApiSettings(); paper = null; mistakes = emptyList(); preview = false
        message = "已清除本机设置、试卷、错题和当前访问口令。"
    }
    fun diagnose(next: ApiSettings) {
        if (busy) return
        busy = true
        generation = viewModelScope.launch {
            try { message = ai.diagnose(next) }
            catch (e: CancellationException) { message = "测试已取消。"; throw e }
            catch (e: Exception) { message = e.message ?: "连接失败，请检查设置。" }
            finally { busy = false }
        }
    }
    fun toggleMistake(question: Question) {
        mistakes = if (mistakes.any { it.stem == question.stem && it.answer == question.answer })
            mistakes.filterNot { it.stem == question.stem && it.answer == question.answer } else mistakes + question
        store.saveMistakes(mistakes)
    }
    fun isCollected(question: Question) = mistakes.any { it.stem == question.stem && it.answer == question.answer }
    fun export(uri: Uri, word: Boolean, answers: Boolean) {
        val current = paper ?: return
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    getApplication<Application>().contentResolver.openOutputStream(uri)?.use {
                        if (word) PaperExport.writeWord(it, current, answers) else PaperExport.writePdf(it, current, answers)
                    } ?: error("无法打开所选文件")
                }
                message = "试卷已导出。"
            } catch (_: Exception) { message = "导出失败，请选择可写入的位置重试。" }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuestionBankApp(vm: BankViewModel = viewModel()) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var answers by rememberSaveable { mutableStateOf(false) }
    val context = LocalContext.current
    val pdf = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { uri -> uri?.let { vm.export(it, false, answers) } }
    val word = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/vnd.openxmlformats-officedocument.wordprocessingml.document")) { uri -> uri?.let { vm.export(it, true, answers) } }
    BackHandler(enabled = vm.preview) { vm.preview = false }
    Scaffold(
        topBar = { TopAppBar(title = { Column { Text("组卷台", fontWeight = FontWeight.Bold); Text("随时出题 · 随手练习", style = MaterialTheme.typography.labelSmall) } },
            actions = { if (vm.paper != null && !vm.preview) TextButton(onClick = { vm.preview = true }) { Text("当前试卷") } }) },
        bottomBar = { NavigationBar { listOf("综合组卷", "方程专项", "错题本", "设置").forEachIndexed { index, name ->
            NavigationBarItem(selected = tab == index, enabled = !vm.busy, onClick = {
                tab = index; vm.preview = false
                if (index < 2) vm.update(vm.spec.copy(equation = index == 1, subject = if (index == 1) "math" else vm.spec.subject, kps = emptyList()))
            }, icon = { Text(listOf("卷", "x", "错", "设")[index], fontWeight = FontWeight.Bold) }, label = { Text(name) })
        } } }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            if (vm.message.isNotBlank()) Surface(color = MaterialTheme.colorScheme.secondaryContainer) {
                Text(vm.message, Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), style = MaterialTheme.typography.bodySmall)
            }
            if (vm.busy) {
                LinearProgressIndicator(Modifier.fillMaxWidth())
                TextButton(onClick = vm::cancel) { Text("取消请求") }
            }
            when {
                vm.preview && vm.paper != null -> PaperScreen(vm.paper!!, answers, { answers = it }, vm::isCollected, vm::toggleMistake,
                    onPdf = { pdf.launch("组卷台-${System.currentTimeMillis()}.pdf") },
                    onWord = { word.launch("组卷台-${System.currentTimeMillis()}.docx") },
                    onCopy = { (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("组卷台", PaperExport.plain(vm.paper!!, answers))) },
                    onShare = { context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply { type = "text/plain"; putExtra(Intent.EXTRA_TEXT, PaperExport.plain(vm.paper!!, answers)) }, "分享试卷")) },
                    onBack = { vm.preview = false })
                tab == 2 -> MistakeScreen(vm.mistakes, vm::toggleMistake)
                tab == 3 -> SettingsScreen(vm.settings, vm.busy, vm::saveSettings, vm::diagnose, vm::clearKey, vm::clearAll)
                else -> SetupScreen(vm.spec, vm.topics, vm.ready && !vm.busy, vm::update, vm::generate)
            }
        }
    }
}

@Composable
private fun <T> Choices(values: List<Pair<T, String>>, selected: T, enabled: Boolean = true, choose: (T) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        values.forEach { (value, label) -> FilterChip(selected = selected == value, enabled = enabled, onClick = { choose(value) }, label = { Text(label) }) }
    }
}

@Composable
private fun SectionTitle(text: String) { Text(text, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold) }

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SetupScreen(spec: BuildSpec, topics: List<Topic>, enabled: Boolean, update: (BuildSpec) -> Unit, generate: () -> Unit) {
    var count by remember(spec.count) { mutableStateOf(spec.count.toString()) }
    var expandTopics by remember { mutableStateOf(false) }
    val grades = when (spec.stage) { "junior" -> 7..9; "senior" -> 10..12; else -> 1..6 }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(if (spec.equation) "方程专项训练" else "按课程生成练习", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) }
        item { Choices(listOf(false to "本地出题 · 离线", true to "AI 原创新题"), spec.ai, enabled) { update(spec.copy(ai = it)) } }
        if (!spec.equation) item {
            SectionTitle("学科")
            Choices(listOf("math" to "数学", "chinese" to "语文", "english" to "英语", "physics" to "物理", "chemistry" to "化学"), spec.subject, enabled) {
                val science = it == "physics" || it == "chemistry"
                update(spec.copy(subject = it, stage = if (science && spec.stage == "primary") "junior" else spec.stage,
                    grade = if (science && spec.grade < 7) (if (it == "physics") 8 else 9) else spec.grade, kps = emptyList()))
            }
        }
        item {
            SectionTitle("学段与年级")
            val stages = if (!spec.equation && spec.subject in listOf("physics", "chemistry")) listOf("junior" to "初中", "senior" to "高中") else listOf("primary" to "小学", "junior" to "初中", "senior" to "高中")
            Choices(stages, spec.stage, enabled) { update(spec.copy(stage = it, grade = when (it) { "junior" -> 7; "senior" -> 10; else -> 5 }, kps = emptyList())) }
            Choices(grades.map { it to if (it > 9) "高${it - 9}" else "${it}年级" }, spec.grade, enabled) { update(spec.copy(grade = it, kps = emptyList())) }
            Choices(listOf(1 to "上学期", 2 to "下学期"), spec.term, enabled) { update(spec.copy(term = it, kps = emptyList())) }
        }
        item {
            SectionTitle("难度")
            Choices(listOf((1 to 2) to "基础", (3 to 3) to "中等", (4 to 5) to "提高", (1 to 5) to "混合"), spec.diffMin to spec.diffMax, enabled) { update(spec.copy(diffMin = it.first, diffMax = it.second)) }
        }
        if (!spec.equation) item {
            SectionTitle("题型")
            Choices(listOf("choice" to "选择", "fill" to "填空", "calc" to "计算", "solve" to "解答", "app" to "应用", "judge" to "判断", "short" to "简答", "writing" to "写作"), spec.type, enabled) { update(spec.copy(type = it)) }
        }
        item {
            OutlinedTextField(value = count, onValueChange = { raw -> count = raw.filter(Char::isDigit).take(3); count.toIntOrNull()?.let { update(spec.copy(count = it.coerceIn(1, 100))) } },
                enabled = enabled, label = { Text("题量") }, supportingText = { Text(if (spec.ai) "AI 最多 40 题，按 5 题分批调用" else "本地最多 100 题") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
        }
        if (!spec.equation) item {
            TextButton(onClick = { expandTopics = !expandTopics }) { Text("知识点：${if (spec.kps.isEmpty()) "当前课程全部" else "已选 ${spec.kps.size} 个"}（${topics.size} 个可用）") }
            if (expandTopics) FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                topics.forEach { topic -> FilterChip(selected = topic.id in spec.kps, enabled = enabled, onClick = {
                    update(spec.copy(kps = if (topic.id in spec.kps) spec.kps - topic.id else spec.kps + topic.id))
                }, label = { Text(topic.name) }) }
            }
            if (topics.isEmpty()) Text("本册暂无可用知识点，请调整学期或年级。", style = MaterialTheme.typography.bodySmall)
        }
        item { Button(onClick = generate, enabled = enabled && (spec.equation || topics.isNotEmpty()), modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Text(if (spec.ai) "AI 生成练习" else "生成练习") } }
        item { Text(if (spec.ai) "使用你在设置中填写的接口，可能产生费用。AI 题目和答案请人工核验。" else "离线出题，无需联网。生成后可以收藏错题、查看解析或导出。", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
    }
}

@Composable
private fun PaperScreen(paper: Paper, answers: Boolean, setAnswers: (Boolean) -> Unit, collected: (Question) -> Boolean,
    toggle: (Question) -> Unit, onPdf: () -> Unit, onWord: () -> Unit, onCopy: () -> Unit, onShare: () -> Unit, onBack: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { TextButton(onClick = onBack) { Text("返回出题设置") }; Text("试卷预览", style = MaterialTheme.typography.labelLarge); Text(paper.title, style = MaterialTheme.typography.headlineSmall) }
        item { Text("共 ${paper.questions.size} 题 · ${if (paper.source == "ai") "AI 原创，答案请人工核验" else "本地题库"}") }
        item { Row { Checkbox(checked = answers, onCheckedChange = setAnswers); Text("显示答案与解析", Modifier.padding(top = 12.dp)) } }
        item { Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onPdf) { Text("导出 PDF") }; OutlinedButton(onClick = onWord) { Text("导出 Word") }; TextButton(onClick = onCopy) { Text("复制") }; TextButton(onClick = onShare) { Text("分享文本") }
        } }
        itemsIndexed(paper.questions) { index, q -> QuestionCard(q, index + 1, answers, collected(q)) { toggle(q) } }
    }
}

@Composable
private fun QuestionCard(q: Question, number: Int, answers: Boolean, collected: Boolean, toggle: () -> Unit) {
    Card(Modifier.fillMaxWidth()) { Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (q.source == "ai") Text("AI 原创 · 答案请人工核验", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
        Text("$number. ${q.stem}", style = MaterialTheme.typography.bodyLarge)
        q.opts.forEach { Text(it) }
        if (answers) { HorizontalDivider(); Text("答案：${q.answer}", fontWeight = FontWeight.SemiBold); if (q.analysis.isNotBlank()) Text("解析：${q.analysis}") }
        TextButton(onClick = toggle) { Text(if (collected) "移出错题本" else "加入错题本") }
    } }
}

@Composable
private fun MistakeScreen(questions: List<Question>, toggle: (Question) -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("我的错题本", style = MaterialTheme.typography.headlineSmall); Text("${questions.size} 道题 · 保存在本机") }
        if (questions.isEmpty()) item { Text("生成练习后，点击题目下方的“加入错题本”即可收藏。") }
        itemsIndexed(questions) { i, q -> QuestionCard(q, i + 1, true, true) { toggle(q) } }
    }
}

@Composable
private fun SettingsScreen(settings: ApiSettings, busy: Boolean, save: (ApiSettings) -> Unit, diagnose: (ApiSettings) -> Unit, clearKey: () -> Unit, clearAll: () -> Unit) {
    var base by remember(settings) { mutableStateOf(settings.baseUrl) }
    var model by remember(settings) { mutableStateOf(settings.model) }
    var key by remember(settings) { mutableStateOf(settings.apiKey) }
    var confirmClear by remember { mutableStateOf(false) }
    val context = LocalContext.current
    if (confirmClear) AlertDialog(onDismissRequest = { confirmClear = false }, title = { Text("清除本机数据？") },
        text = { Text("将删除本机保存的试卷、错题和接口设置，无法撤销。已导出的文件不受影响。") },
        confirmButton = { TextButton(onClick = { confirmClear = false; base = ""; model = ""; key = ""; clearAll() }) { Text("清除") } },
        dismissButton = { TextButton(onClick = { confirmClear = false }) { Text("取消") } })
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("个人 API 设置", style = MaterialTheme.typography.headlineSmall); Text("支持 OpenAI 兼容接口。地址和模型保存在本机；密钥只保存在当前运行内存。") }
        item { OutlinedTextField(base, { base = it }, label = { Text("API 地址") }, placeholder = { Text("https://api.example.com/v1") }, enabled = !busy, singleLine = true, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(model, { model = it }, label = { Text("模型 ID") }, enabled = !busy, singleLine = true, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(key, { key = it }, label = { Text("API Key / 代理访问口令") }, visualTransformation = PasswordVisualTransformation(), enabled = !busy, singleLine = true, modifier = Modifier.fillMaxWidth()) }
        item { Button(onClick = { save(ApiSettings(base, model, key)) }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("保存设置") } }
        item { OutlinedButton(onClick = { diagnose(ApiSettings(base, model, key)) }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text("测试连接") } }
        item { TextButton(onClick = { key = ""; clearKey() }, enabled = !busy) { Text("清除本次密钥") } }
        item { Text("每位用户使用自己的 API 和额度。应用未内置公共 AI 账号，也不会把密钥发送给项目作者。若使用自己的代理，在密钥栏填写该代理的访问口令。", style = MaterialTheme.typography.bodySmall) }
        item { HorizontalDivider(); SectionTitle("隐私与本机数据"); Text("试卷、错题、接口地址和模型只保存在本机。AI 请求会把出题条件及近期题目发送到你填写的服务商；使用前请了解其隐私政策。应用不含广告或统计 SDK。", style = MaterialTheme.typography.bodySmall) }
        item { TextButton(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://your98k.github.io/Test-Paper-Compilation-Platform/privacy.html"))) }) { Text("隐私说明") } }
        item { OutlinedButton(onClick = { confirmClear = true }, enabled = !busy) { Text("清除本机全部数据") } }
        item { Text("组卷台 Android 0.1.0 · 离线题库随应用更新。", style = MaterialTheme.typography.bodySmall) }
    }
}
