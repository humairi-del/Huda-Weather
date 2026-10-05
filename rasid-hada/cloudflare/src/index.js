import { Client } from "pg";

const json = (body, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        status: "ok",
        service: "rasid-hada",
        environment: "production"
      });
    }

    if (url.pathname === "/health/db") {
      const client = new Client({
        connectionString: env.HYPERDRIVE.connectionString
      });

      try {
        await client.connect();
        const result = await client.query("SELECT 1 AS ok");
        const connected = result.rows?.[0]?.ok === 1;

        return json(
          {
            status: connected ? "ok" : "error",
            database: connected ? "connected" : "unavailable"
          },
          connected ? 200 : 503
        );
      } catch {
        return json(
          {
            status: "error",
            database: "unavailable"
          },
          503
        );
      } finally {
        try {
          await client.end();
        } catch {
          // Never expose connection details or credentials.
        }
      }
    }

    return new Response("Rasid Hada", {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }
};
