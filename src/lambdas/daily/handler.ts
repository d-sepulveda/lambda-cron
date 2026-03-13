export async function handler(event: unknown) {
  console.log("Daily cron executed", JSON.stringify(event));
  return { statusCode: 200, body: JSON.stringify({ message: "Daily cron done" }) };
}
