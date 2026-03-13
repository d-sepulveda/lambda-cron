export async function handler(event: unknown) {
  console.log("Lambda Cron executed", JSON.stringify(event));

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Lambda Cron executed successfully" }),
  };
}
