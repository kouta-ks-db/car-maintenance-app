export async function GET(request: Request, env: any) {
  const { DB } = env;

  const result = await DB.prepare(
    'SELECT * FROM fuel_logs ORDER BY id DESC'
  ).all();

  return Response.json(result.results);
}