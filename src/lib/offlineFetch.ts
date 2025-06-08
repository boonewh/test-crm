import { db } from "./db";
import { isOnline } from "./network";
import { apiFetch } from "./api";

// Define endpoints and how they map to cache tables
const cacheMap = {
  "/leads/": "leads",
  "/clients/": "clients",
  "/projects/": "projects",
  "/interactions/": "interactions"
} as const;

type CacheTable = keyof typeof cacheMap;

export async function offlineFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method?.toUpperCase() || "GET") as "GET" | "POST" | "PUT" | "DELETE";

  // ✅ ONLINE: Perform real fetch and update cache if it's a GET
  if (isOnline()) {
    const res = await apiFetch(url, options);

    // Cache successful GET response
    if (method === "GET" && res.ok) {
      const body = await res.clone().json();
      const key = Object.keys(cacheMap).find((prefix) => url.startsWith(prefix)) as CacheTable;
      if (key && Array.isArray(body)) {
        const table = db[cacheMap[key] as keyof typeof db] as any;
        await table.clear();
        await table.bulkAdd(body);
      }
    }

    return res;
  }

  // 🚫 OFFLINE
  if (method === "GET") {
    // Return cached data if available
    const key = Object.keys(cacheMap).find((prefix) => url.startsWith(prefix)) as CacheTable;
    if (key) {
      const table = db[cacheMap[key] as keyof typeof db] as any;
      const results = await table.toArray();
      return new Response(JSON.stringify(results), { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Offline and not cached" }), { status: 503 });
  }

  // ✏️ Queue POST, PUT, DELETE
  if (["POST", "PUT", "DELETE"].includes(method)) {
    const body = options.body ? JSON.parse(options.body.toString()) : {};

    await db.offlineQueue.add({
      url,
      method: method as "POST" | "PUT" | "DELETE",
      body,
      timestamp: Date.now()
    });

    return new Response(JSON.stringify({ queued: true }), { status: 202 });
  }

  // ❓ Unsupported request type
  return new Response(JSON.stringify({ error: "Unsupported offline request" }), { status: 400 });
}
