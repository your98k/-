# 中小学智能题库 · PWA

纯前端、无后端的 K12 组卷应用：数学（小学 / 初中 / 高中）、物理、化学、英语、语文，按知识点组卷，KaTeX 公式渲染，错题本，A4 打印 / Word / 文本导出。

题目支持两种来源：`core/` + `generators/` 的本地模板随机生成，以及使用个人 API 的 **AI 原创新题**。不收录第三方付费题库原题，也不把 AI 生成内容标为最新真题。

## AI 原创新题（个人 API）

1. 选择「AI 原创新题」，点击「API 设置」。
2. 填写 **OpenAI 兼容 Chat Completions** 接口的 HTTPS 地址（例如 `https://api.example.com/v1`，也支持完整 `/chat/completions` 地址）、模型 ID 和个人 API Key。
3. 保存设置，再按学科、年级、学期、知识点、难度和大题题量点击「AI 生成试卷」。**保存、切换模式和刷新页面都不会自动调用模型。**
4. 如只需重出一道题，在 AI 题旁点击「AI 换题」；其他题和原分值不变。生成失败、超时或取消均保留原卷 / 原题。

### 隐私、计费与兼容性

- **API Key 只保存在当前页面内存**，不写入 localStorage、Service Worker 缓存或 GitHub；刷新后需重新填写。只记住接口地址和模型，支持一键清除。浏览器中的 Key 不等同于保险箱，请使用可信接口和低额度专用 Key。
- 浏览器直接请求你填写的地址，Key 仅用作该接口的 Authorization 请求头；拒绝跳转、远程 HTTP、带凭据 / 查询参数 / 片段的地址。HTTP 只允许本地开发的 localhost / 127.0.0.1 / [::1]。
- 服务商必须支持 **CORS 浏览器跨域请求**，包括 Authorization 与 Content-Type 请求头。只支持 Node / 服务端 SDK 的接口不一定可从网页调用；遇到错误请联系服务商，勿使用公共代理转发密钥或关闭安全限制。
- **点击生成才按服务商规则计费**。每卷最多 40 题，每次请求最多 5 题、顺序执行，单批超时 90 秒；不自动重试、不偷偷探测模型。取消可阻止后续批次，已发出的请求仍可能收费。
- 向接口发送出卷条件及少量近期题干用于避重，不发送密钥以外的账户信息、错题次数或学生作答。精确重复检查覆盖本卷、页面最近生成题以及最近部分题目记录；**不能保证与全网或全部历史题绝不重复**。
- 输出检查题量、题型、知识点、难度、选项、答案格式和重复题；这些是**结构校验，不是答案正确性保证**。模型可能算错或误判教材范围，使用前请核验答案和解析。AI 题在网页、导出与错题本中均保留「AI 原创 / 答案需核验」标记。
- 不要求服务商专有 JSON 模式，使用标准非流式 Chat Completions；模型需能按要求返回 JSON 和纯文本数学表达式。仅支持 Responses / Gemini 原生 / Anthropic 原生协议的端点需由服务商提供 OpenAI 兼容转换。
- AI 功能需要联网；离线时可主动切回本地题库。API 请求及结果不进入 Service Worker 网络缓存，生成成功的题目按原有规则进入本机题目 / 错题记录。

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
- 本地题目为自建模板生成器产出，AI 题目由个人所选模型原创生成，两者均不冒充第三方真题。后续接入外部内容时，应独立确认授权，代码 MIT 许可不代表外部题目的版权授权。
