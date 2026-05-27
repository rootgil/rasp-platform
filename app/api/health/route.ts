export async function GET() {
  return Response.json({ status: "ok", service: "rasp-platform", timestamp: new Date().toISOString() });
}
