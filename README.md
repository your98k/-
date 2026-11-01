# 中小学智能题库 · PWA

纯前端、无后端的 K12 组卷应用：数学（小学 / 初中 / 高中）、物理、化学、英语、语文，按知识点组卷，KaTeX 公式渲染，错题本，A4 打印 / Word / 文本导出。

题目由 `core/` + `generators/` 的模板生成器按规则实时生成，不收录第三方付费题库原题。

## 本地预览

```bash
node tools/build-web.js      # 生成 web-bank/kb.bundle.js

# KaTeX（仓库不提交字体二进制，部署时由 Actions 下载；本地预览需手动准备）
curl -L -o katex.tgz https://registry.npmjs.org/katex/-/katex-0.16.11.tgz
tar -xzf katex.tgz
mkdir -p web-bank/vendor/katex
cp package/dist/katex.min.js package/dist/katex.min.css web-bank/vendor/katex/
cp -R package/dist/fonts web-bank/vendor/katex/

python -m http.server 8080
# 打开 http://localhost:8080/web-bank/
```

也可以直接从本地项目复制 `web-bank/vendor/katex/`。

## 部署到 GitHub Pages

推送到 `main` 后，GitHub Actions `Deploy PWA` 会自动：

1. 运行 `node tools/build-web.js` 生成 `web-bank/kb.bundle.js`；
2. 下载 KaTeX 0.16.11 的 CSS / JS / 字体；
3. 把 `web-bank/` 发布到 GitHub Pages。

首次部署如未自动开启 Pages：仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，再手动运行一次工作流。

站点地址：`https://your98k.github.io/k12-question-bank/`

## 目录

```
web-bank/           PWA 前端（index.html / app.js / style.css / sw.js / manifest）
core/               随机源、题目模型、知识点注册表、组卷内核
generators/         各学科题目生成器
utils/bank.js       人教版小学数学生成逻辑（被 math-primary 复用）
tools/build-web.js  把 core + generators 打成 web-bank/kb.bundle.js
.github/workflows/  GitHub Pages 自动部署
```

## 说明

- `web-bank/kb.bundle.js` 与 `web-bank/vendor/` 是构建产物，已加入 `.gitignore`，由 CI 生成。
- 题库内容为自建模板生成器产出；如需接入自有/授权题库，可用原项目里的 `tools/bank-importer`。
- 未附加开源许可证；如需开源请自行添加 LICENSE。
