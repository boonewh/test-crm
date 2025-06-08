import { db } from "./db";
import { isOnline } from "./network";
import { apiFetch } from "./api";

let syncing = false;

export async function syncOfflineQueue(): Promise<void> {
  if (syncing || !isOnline()) return;
  syncing = true;

  const queue = await db.offlineQueue.toArray();

  for (const item of queue) {
    try {
      const res = await apiFetch(item.url, {
        method: item.method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item.body),
      });

      if (res.ok) {
        await db.offlineQueue.delete(item.id!);
        console.log("✅ Synced:", item.method, item.url);
      } else {
        console.warn("❌ Sync failed (server error):", item.method, item.url);
      }
    } catch (err) {
      console.warn("❌ Sync failed (offline or network error):", item.method, item.url);
    }
  }

  syncing = false;
}
