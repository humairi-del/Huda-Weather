import postgres from "postgres";

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
      return json({ status: "ok", service: "rasid-hada", environment: "production" });
    }

    if (url.pathname === "/health/db") {
      const sql = postgres(env.HYPERDRIVE.connectionString, {
        max: 1,
        fetch_types: false,
        prepare: true
      });

      try {
        const result = await sql`
          SELECT version
          FROM schema_migrations
          WHERE version = '001_initial_governance'
        `;
        const ready = result?.[0]?.version === "001_initial_governance";
        return json(
          {
            status: ready ? "ok" : "error",
            database: ready ? "connected" : "unavailable",
            schema: ready ? "ready" : "unavailable"
          },
          ready ? 200 : 503
        );
      } catch {
        return json({ status: "error", database: "unavailable", schema: "unavailable" }, 503);
      } finally {
        try { await sql.end({ timeout: 1 }); } catch {}
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
