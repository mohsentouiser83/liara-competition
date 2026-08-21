export function log(event: string, fields: Record<string, string | number | boolean | undefined>) {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields }));
}
