<?php
/**
 * Endpoint: /api/debug_report.php
 * Público, sin JWT — recibe reportes del modo debug del sitio (?Debug=1).
 * Copiado literal de FERRIMIX (D-15/D-31 en DECISIONS.md), que a su vez lo
 * copió de Parque San Pedro: un mecanismo de seguridad nuevo nunca debe
 * poder tumbar la función principal, así que DEBUG_REPORT_KEY es opcional
 * — si no está configurada, el endpoint queda abierto en vez de romperse.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

const MAX_DESCRIPTION_LENGTH = 2000;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, null, 'Método no permitido', 405);
}

$body = getJSONInput();

// Honeypot anti-spam — campo oculto que un humano nunca llena.
if (!empty($body['website'])) {
    jsonResponse(false, null, 'Solicitud rechazada', 400);
}

if (defined('DEBUG_REPORT_KEY') && DEBUG_REPORT_KEY !== '') {
    $key = (string) ($body['debug_key'] ?? '');
    if (!hash_equals(DEBUG_REPORT_KEY, $key)) {
        jsonResponse(false, null, 'Clave de debug inválida', 403);
    }
}

$description = trim((string) ($body['description'] ?? ''));
if ($description === '') {
    jsonResponse(false, null, 'La descripción es obligatoria', 400);
}
if (mb_strlen($description) > MAX_DESCRIPTION_LENGTH) {
    jsonResponse(false, null, 'La descripción es demasiado larga', 400);
}

$pageUrl = redactDebugParams(trim((string) ($body['page_url'] ?? '')));
$pagePath = redactDebugParams(trim((string) ($body['page_path'] ?? '')));
$elementTag = trim((string) ($body['element_tag'] ?? ''));
$elementText = trim((string) ($body['element_text'] ?? ''));
$elementSelector = trim((string) ($body['element_selector'] ?? ''));

$fixesDir = dirname(__DIR__) . '/upgrade/fixes';
if (!is_dir($fixesDir) && !mkdir($fixesDir, 0755, true)) {
    jsonResponse(false, null, 'No se pudo crear el directorio de reportes', 500);
}

$timestamp = new DateTimeImmutable('now');
$slug = slugFromReport($elementSelector, $pagePath);
$filename = $timestamp->format('Y-m-d_Hi') . '-' . $slug . '.md';
$filepath = $fixesDir . '/' . $filename;

$elementLine = $elementTag !== '' ? $elementTag : 'elemento';
if ($elementSelector !== '') {
    $elementLine .= ' `' . $elementSelector . '`';
}
if ($elementText !== '') {
    $elementLine .= ' — "' . $elementText . '"';
}

$pageLine = $pageUrl !== '' ? $pageUrl : ($pagePath !== '' ? $pagePath : '(desconocida)');

$content = implode("\n", [
    '# Fix report',
    '',
    '- **Date:** ' . $timestamp->format('c'),
    '- **Page:** ' . $pageLine,
    '- **Element:** ' . $elementLine,
    '',
    '## Issue',
    '',
    $description,
    '',
]);

if (file_put_contents($filepath, $content) === false) {
    jsonResponse(false, null, 'No se pudo guardar el reporte', 500);
}

jsonResponse(true, ['file' => $filename], 'Reporte guardado', 201);

function slugFromReport(string $selector, string $path): string {
    $source = $selector !== '' ? $selector : $path;
    $source = strtolower($source);
    $source = preg_replace('/[^a-z0-9]+/', '-', $source) ?? 'report';
    $source = trim($source, '-');
    if ($source === '') {
        $source = 'report';
    }
    return substr($source, 0, 48);
}

// Los reportes se commitean a git — nunca dejar que la clave de debug
// quede guardada dentro de uno (viaja como query param en page_url/page_path).
function redactDebugParams(string $url): string {
    if ($url === '') {
        return $url;
    }

    $parts = parse_url($url);
    if ($parts === false) {
        return $url;
    }

    $rebuilt = '';
    if (isset($parts['scheme'])) {
        $rebuilt .= $parts['scheme'] . '://';
    }
    if (isset($parts['host'])) {
        $rebuilt .= $parts['host'];
    }
    if (isset($parts['port'])) {
        $rebuilt .= ':' . $parts['port'];
    }
    $rebuilt .= $parts['path'] ?? '';

    if (isset($parts['query'])) {
        parse_str($parts['query'], $query);
        unset($query['key'], $query['debug_key']);
        if (!empty($query)) {
            $rebuilt .= '?' . http_build_query($query);
        }
    }

    if (isset($parts['fragment'])) {
        $rebuilt .= '#' . $parts['fragment'];
    }

    return $rebuilt;
}
