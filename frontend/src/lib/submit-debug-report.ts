export interface DebugReportPayload {
  description: string;
  page_url: string;
  page_path: string;
  element_tag: string;
  element_text: string;
  element_selector: string;
  debug_key?: string;
  website?: string;
}

export async function submitDebugReport(payload: DebugReportPayload): Promise<{ file: string }> {
  const res = await fetch('/api/debug_report.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok || !body?.success) {
    throw new Error(body?.message ?? 'No se pudo enviar el reporte');
  }

  return { file: body.data?.file ?? '' };
}
