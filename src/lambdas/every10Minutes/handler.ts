export async function handler(event: unknown) {
  console.log("Every 10 minutes cron executed", JSON.stringify(event));
  return { statusCode: 200, body: JSON.stringify({ message: "Every 10 minutes cron done" }) };
}
