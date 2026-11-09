package io.github.your98k.questionbank

import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/** Native PDF and genuine OOXML .docx exports; no browser renderer is involved. */
object PaperExport {
    fun plain(paper: Paper, answers: Boolean): String = buildString {
        appendLine(paper.title)
        appendLine("共 ${paper.questions.size} 题 · ${if (paper.source == "ai") "AI 原创，答案请人工核验" else "本地练习"}")
        if (paper.notice.isNotBlank()) appendLine(paper.notice)
        appendLine()
        paper.questions.forEachIndexed { index, question ->
            appendLine("${index + 1}. ${question.stem}")
            question.opts.forEachIndexed { option, value ->
                appendLine(if (Regex("^[A-F][.．、:]\\s*.*").matches(value)) value else "${'A' + option}. $value")
            }
            appendLine("解：")
            appendLine()
            appendLine()
        }
        if (answers) {
            appendLine("参考答案与解析")
            paper.questions.forEachIndexed { index, question ->
                appendLine("${index + 1}. ${question.answer}")
                appendLine(question.analysis)
                appendLine()
            }
        }
    }

    fun writePdf(output: OutputStream, paper: Paper, answers: Boolean) {
        val document = PdfDocument()
        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 12f; color = Color.BLACK }
        val footer = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 9f; color = Color.DKGRAY }
        val text = plain(paper, answers)
        val layout = StaticLayout.Builder.obtain(text, 0, text.length, paint, 499)
            .setAlignment(Layout.Alignment.ALIGN_NORMAL).setLineSpacing(3f, 1f).setIncludePad(false).build()
        var firstLine = 0
        var pageNumber = 1
        try {
            while (firstLine < layout.lineCount) {
                val top = layout.getLineTop(firstLine)
                var lastLine = firstLine
                while (lastLine + 1 < layout.lineCount && layout.getLineBottom(lastLine + 1) - top <= 730) lastLine++
                val page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, pageNumber).create())
                page.canvas.save()
                page.canvas.clipRect(48, 44, 547, 44 + layout.getLineBottom(lastLine) - top)
                page.canvas.translate(48f, 44f - top)
                layout.draw(page.canvas)
                page.canvas.restore()
                page.canvas.drawText("组卷台 · 第 $pageNumber 页", 48f, 808f, footer)
                document.finishPage(page)
                firstLine = lastLine + 1
                pageNumber++
            }
            document.writeTo(output)
        } finally { document.close() }
    }

    fun writeWord(output: OutputStream, paper: Paper, answers: Boolean) {
        val body = plain(paper, answers).lines().joinToString("") { line ->
            "<w:p><w:r><w:t xml:space=\"preserve\">${xml(line)}</w:t></w:r></w:p>"
        }
        ZipOutputStream(output).use { zip ->
            fun entry(name: String, content: String) {
                zip.putNextEntry(ZipEntry(name)); zip.write(content.toByteArray(Charsets.UTF_8)); zip.closeEntry()
            }
            entry("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>""")
            entry("_rels/.rels", """<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>""")
            entry("word/document.xml", """<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>$body<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>""")
        }
    }

    private fun xml(value: String) = value.filter { it == '\t' || it.code >= 32 }.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;")
}
