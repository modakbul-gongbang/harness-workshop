export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDatabase } = await import("./server/database");
    // Validate settings and open storage before accepting requests.
    getDatabase();
  }
}
