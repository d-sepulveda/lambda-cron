export async function handler(event: unknown) {
  console.log("Every minute cron executed", JSON.stringify(event));
  return { statusCode: 200, body: JSON.stringify({ message: "Every minute cron done" }) };
}