export async function handler(event: unknown): Promise<void> {
  console.log("Lambda Cron executed", JSON.stringify(event));
}
