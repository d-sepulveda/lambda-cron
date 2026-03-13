export async function handler(event: unknown) {
  console.log("Manual trigger executed", JSON.stringify(event));
  return { statusCode: 200, body: JSON.stringify({ message: "Manual trigger done" }) };
}
