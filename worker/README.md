# 个人 AI 代理（可选）

多数 AI 服务商不允许网页直接调用（跨域 CORS 拦截），这时用这个 Worker 做一层转发。**密钥只存在 Cloudflare，不会出现在网页里。**

## 部署（约 3 分钟）

1. 打开 Cloudflare Dashboard → **Workers & Pages** → **Create** → **Worker**。
2. 起个名字（例如 `k12-ai-proxy`），把 `ai-proxy.js` 的内容整段粘贴进去，**Deploy**。
3. 进入该 Worker → **Settings** → **Variables and Secrets**，添加：

| 变量 | 说明 | 示例 |
| --- | --- | --- |
| `UPSTREAM_BASE` | 服务商的 OpenAI 兼容地址（不要带 `/chat/completions`） | `https://api.deepseek.com/v1` |
| `UPSTREAM_KEY` | 服务商 API Key（Secret） | `sk-...` |
| `ACCESS_TOKEN` | 给网页用的访问口令，自己随便设一串（Secret） | 32 位随机串 |
| `ALLOW_ORIGIN` | 可选，限制来源 | `https://your98k.github.io` |

4. 在题库的「API 设置」里填写：

- **API 地址**：`https://<你的-worker>.workers.dev/v1`
- **模型 ID**：服务商提供的模型名，如 `deepseek-chat`
- **API Key**：上面设置的 `ACCESS_TOKEN`

保存后点 **测试连接**，应显示“连接成功”。

## 说明

- Worker 只转发 `POST` 到 `<UPSTREAM_BASE>/chat/completions`，不记录密钥、不落盘。
- 请求体上限 1MB；不做流式转发（题库本身使用非流式请求）。
- `ACCESS_TOKEN` 建议必填，否则任何人都能拿你的 Worker 消耗额度。
- 如果只给自己用，可以在 Cloudflare 侧再加 Rate Limiting 或 WAF 规则。
