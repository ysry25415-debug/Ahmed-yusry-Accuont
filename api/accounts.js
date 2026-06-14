const TABLE_NAME = process.env.SUPABASE_ACCOUNTS_TABLE || "accounts";

function getSupabaseConfig() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return { key, url };
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function getHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : {};
}

function pickAccountPayload(payload) {
  const account = payload.account || payload;

  return {
    id: account.id,
    game_id: account.game_id,
    image: account.image || "",
    description: account.description || "",
    info: account.info || "",
    price: Number(account.price) || 0,
    status: account.status || "pending",
    delivered: Boolean(account.delivered),
    deleted: Boolean(account.deleted),
    created_at: account.created_at || new Date().toISOString(),
    updated_at: account.updated_at || null,
    deleted_at: account.deleted_at || null,
  };
}

module.exports = async function handler(request, response) {
  const { key, url } = getSupabaseConfig();

  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (!url || !key) {
    sendJson(response, 503, {
      error: "Supabase environment variables are missing.",
      required: [
        "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY",
      ],
    });
    return;
  }

  try {
    if (request.method === "GET") {
      const result = await fetch(`${url}/rest/v1/${TABLE_NAME}?select=*&order=created_at.desc`, {
        headers: getHeaders(key),
      });
      const payload = await result.json();
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { accounts: payload } : { error: payload });
      return;
    }

    if (request.method === "POST") {
      const body = await readBody(request);
      const account = pickAccountPayload(body);
      const result = await fetch(`${url}/rest/v1/${TABLE_NAME}`, {
        method: "POST",
        headers: {
          ...getHeaders(key),
          Prefer: "return=representation",
        },
        body: JSON.stringify(account),
      });
      const payload = await result.json();
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { account: payload[0] } : { error: payload });
      return;
    }

    if (request.method === "PATCH") {
      const requestUrl = new URL(request.url, "http://localhost");
      const id = requestUrl.searchParams.get("id");

      if (!id) {
        sendJson(response, 400, { error: "Missing account id." });
        return;
      }

      const body = await readBody(request);
      const account = pickAccountPayload(body);
      const result = await fetch(`${url}/rest/v1/${TABLE_NAME}?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          ...getHeaders(key),
          Prefer: "return=representation",
        },
        body: JSON.stringify(account),
      });
      const payload = await result.json();
      sendJson(response, result.ok ? 200 : result.status, result.ok ? { account: payload[0] } : { error: payload });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed." });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
};
