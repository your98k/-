/**
 * 个人 AI 代理（Cloudflare Worker）
 * 浏览器 → 本 Worker → 你的 OpenAI 兼容服务商。
 * 密钥只放在 Worker 环境变量里，不下发到网页。
 *
 * 环境变量（Settings → Variables and Secrets）：
 *   UPSTREAM_BASE  上游地址，如 https://api.deepseek.com/v1
 *   UPSTREAM_KEY   上游 API Key
 *   ACCESS_TOKEN   网页访问口令（可留空，但不建议）
 *   ALLOW_ORIGIN   允许的来源，默认 *；可填 https://your98k.github.io
 */
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOW_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin'
    };
    const json = (body, status) => new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    if (env.ACCESS_TOKEN) {
      const auth = request.headers.get('Authorization') || '';
      if (auth !== 'Bearer ' + env.ACCESS_TOKEN) return json({ error: 'Unauthorized' }, 401);
    }

    const upstream = String(env.UPSTREAM_BASE || '').replace(/\/+$/, '');
    if (!upstream) return json({ error: 'UPSTREAM_BASE is not configured' }, 500);
    if (!env.UPSTREAM_KEY) return json({ error: 'UPSTREAM_KEY is not configured' }, 500);

    const body = await request.text();
    if (body.length > 1024 * 1024) return json({ error: 'Request too large' }, 413);

    let response;
    try {
      response = await fetch(upstream + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + env.UPSTREAM_KEY
        },
        body
      });
    } catch (_) {
      return json({ error: 'Upstream unreachable' }, 502);
    }

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        ...cors,
        'Content-Type': response.headers.get('Content-Type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }
};
