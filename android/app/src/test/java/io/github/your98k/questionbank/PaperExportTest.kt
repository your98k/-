package io.github.your98k.questionbank

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.util.zip.ZipInputStream
import javax.xml.parsers.DocumentBuilderFactory

class PaperExportTest {
    private val paper = Paper("方程 <练习>", listOf(Question("1", "x + 2 = 5", "x = 3", "两边减2")), "ai")

    @Test fun exportPreservesAiAttributionAndAnswerVisibility() {
        assertTrue(PaperExport.plain(paper, false).contains("AI 原创，答案请人工核验"))
        assertFalse(PaperExport.plain(paper, false).contains("x = 3"))
        assertTrue(PaperExport.plain(paper, true).contains("x = 3"))
    }

    @Test fun wordExportIsValidOoxmlZip() {
        val output = ByteArrayOutputStream()
        PaperExport.writeWord(output, paper, true)
        val files = mutableMapOf<String, ByteArray>()
        ZipInputStream(ByteArrayInputStream(output.toByteArray())).use { zip ->
            while (true) {
                val entry = zip.nextEntry ?: break
                files[entry.name] = zip.readBytes()
            }
        }
        assertTrue(files.containsKey("[Content_Types].xml"))
        assertTrue(files.containsKey("_rels/.rels"))
        val xml = files.getValue("word/document.xml")
        DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(ByteArrayInputStream(xml))
        assertTrue(xml.toString(Charsets.UTF_8).contains("&lt;练习&gt;"))
        assertTrue(xml.toString(Charsets.UTF_8).contains("x = 3"))
    }
}
