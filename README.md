# 中小学智能题库 · PWA

纯前端、无后端的 K12 组卷应用：数学（小学 / 初中 / 高中）、物理、化学、英语、语文，按知识点组卷，KaTeX 公式渲染，错题本，A4 打印 / Word / 文本导出。

题目由 `core/` + `generators/` 的模板生成器按规则实时生成，不收录第三方付费题库原题。

## 本地预览

需要 **Node.js 22+**。首次安装依赖需要联网，后续构建与测试不需要下载字体或工具。

```bash
npm ci
npm run preview
# 打开 http://127.0.0.1:8080/k12-question-bank/
```

`preview` 会先自动构建，再启动 Node 自带的 HTTP 服务；不需要 Python。
如需换端口，可运行 `npm run preview -- 8081`。

```bash
npm run build   # 完整站点输出到 _site/
npm test        # 构建可复现性、图标、离线资源、缓存隔离和更新行为回归测试
```

## PWA 图标、离线与更新

- 从 `web-bank/icons/icon.svg` 自动生成 180 / 192 / 512 PNG，以及独立的 512 maskable 图标；文字已转为路径，无需系统中文字体。iOS 主屏图标使用 180 PNG。
- 构建自动复制锁定版本的 KaTeX JS、CSS 和全部字体，保留第三方许可证。完整缓存成功后，才提供离线使用。
- `package.json` 是应用版本号的唯一来源；构建根据发布内容生成指纹，写入 `_site/build-info.js` 和 `build-info.json`，页面与 Service Worker 共用同一版本。相同内容重复构建不会产生无意义的版本变化。
- HTML 的脚本 / 样式链接带构建指纹，避免旧版 PWA 缓存混入新页面。缓存按应用和部署路径隔离，不删除同域其他站点的缓存。
- 新版下载成功后显示「刷新更新」。**不会自动刷新正在编辑的试卷**；请先导出，确认后再更新，或关闭本站全部页面后重新打开。错题本仍保存在原有 localStorage，不做迁移或清空。
- 首次使用、从旧版本迁移、下载新版均需要联网。旧版通用名称缓存不会被贸然清理，以免误删同源其他部署的数据。

## 部署到 GitHub Pages

推送到 `main` 后，GitHub Actions `Deploy PWA` 会自动运行：

1. `npm ci`，按 `package-lock.json` 安装依赖；
2. `npm run build`，生成完整 `_site/`（题库内核、PNG 图标、KaTeX、内容指纹和离线清单）；
3. `npm test`，全部通过后再发布 `_site/`。

PR 也会构建和测试，但不会部署。首次部署如未自动开启 Pages：仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，再手动运行一次工作流。

站点地址：[在线组卷台](https://your98k.github.io/k12-question-bank/)

## 目录

```
web-bank/             PWA 前端源码（页面 / 样式 / Service Worker / 图标）
core/                 随机源、题目模型、知识点注册表、组卷内核
generators/           各学科题目生成器
utils/bank.js         人教版小学数学生成逻辑（被 math-primary 复用）
tools/build-web.js    极简 CommonJS 打包器
tools/build-site.js   统一站点构建、PNG 图标与内容指纹
tools/preview.js      本地 HTTP 预览
tests/                Node 内置测试框架回归测试
_site/                构建产物，不提交到仓库
.github/workflows/    GitHub Pages 自动测试与部署
```

## 许可证与内容说明

- 本项目自有代码采用 [MIT License](LICENSE)。KaTeX 等第三方组件保留各自许可证，KaTeX 的许可证随站点复制到 `vendor/katex/LICENSE`。
- 图标字形为 Noto Sans SC 转曲图形，来源与 SIL OFL 1.1 许可信息记录在 SVG 注释中；不分发字体软件。
- 题目为自建模板生成器产出，不收录第三方付费题库原题。后续接入外部内容时，应独立确认授权，代码 MIT 许可不代表外部题目的版权授权。
