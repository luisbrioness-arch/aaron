import { submitDebugReport } from './submit-debug-report';

const STORAGE_KEY = 'aaron_debug_mode';
const STORAGE_KEY_SECRET = 'aaron_debug_key';
const DEBUG_UI_ATTR = 'data-debug-ui';

let pickMode = false;
let highlightedEl: Element | null = null;

function isDebugActive(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get('Debug') === '1' || params.get('debug') === '1') {
    sessionStorage.setItem(STORAGE_KEY, '1');
    return true;
  }
  return sessionStorage.getItem(STORAGE_KEY) === '1';
}

function getDebugKey(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('key');
  if (key) {
    sessionStorage.setItem(STORAGE_KEY_SECRET, key);
    return key;
  }
  const stored = sessionStorage.getItem(STORAGE_KEY_SECRET);
  return stored ?? undefined;
}

function isDebugUi(el: Element | null): boolean {
  if (!el) return false;
  return el.closest(`[${DEBUG_UI_ATTR}]`) !== null;
}

function truncate(text: string, max = 120): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1) + '…';
}

function buildSelector(el: Element): string {
  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }

  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body && parts.length < 4) {
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const currentTag = current.tagName;
    const siblings = Array.from(parent.children).filter((c) => c.tagName === currentTag);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${tag}:nth-of-type(${index})`);
    current = parent;
  }

  return parts.join(' > ');
}

function injectStyles(): void {
  if (document.getElementById('aaron-debug-styles')) return;

  const style = document.createElement('style');
  style.id = 'aaron-debug-styles';
  style.textContent = `
    .aaron-debug-highlight {
      outline: 2px solid #c6720b !important;
      outline-offset: 2px !important;
      cursor: crosshair !important;
    }
    body.aaron-debug-picking {
      cursor: crosshair !important;
    }
    body.aaron-debug-picking *:not([${DEBUG_UI_ATTR}]):not([${DEBUG_UI_ATTR}] *) {
      cursor: crosshair !important;
    }
  `;
  document.head.appendChild(style);
}

function clearHighlight(): void {
  if (highlightedEl) {
    highlightedEl.classList.remove('aaron-debug-highlight');
    highlightedEl = null;
  }
}

function setPickMode(active: boolean): void {
  pickMode = active;
  document.body.classList.toggle('aaron-debug-picking', active);
  if (!active) clearHighlight();
}

function showToast(message: string, isError = false): void {
  const existing = document.querySelector(`[${DEBUG_UI_ATTR}="toast"]`);
  existing?.remove();

  const toast = document.createElement('div');
  toast.setAttribute(DEBUG_UI_ATTR, 'toast');
  toast.style.cssText = `
    position: fixed; bottom: 5rem; right: 1rem; z-index: 9999; max-width: 24rem;
    border-radius: 0.5rem; padding: 0.75rem 1rem; font-size: 0.875rem;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    background: ${isError ? '#a23b2e' : '#b87a22'}; color: #fffdf7;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function openReportDialog(el: Element): void {
  const overlay = document.createElement('div');
  overlay.setAttribute(DEBUG_UI_ATTR, 'dialog');
  overlay.style.cssText =
    'position: fixed; inset: 0; z-index: 9998; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); padding: 1rem;';

  const tag = el.tagName.toLowerCase();
  const text = truncate(el.textContent ?? '');
  const selector = buildSelector(el);

  overlay.innerHTML = `
    <div style="width: 100%; max-width: 32rem; border-radius: 0.75rem; background: #fffdf7; padding: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);" role="dialog" aria-labelledby="aaron-debug-title">
      <h2 id="aaron-debug-title" style="font-size: 1.125rem; font-weight: 600; color: #b87a22; margin-bottom: 0.25rem;">Reportar problema</h2>
      <p style="font-size: 0.875rem; color: #5c5138; margin-bottom: 1rem;">Describe el problema con el elemento seleccionado.</p>
      <dl style="margin-bottom: 1rem; font-size: 0.75rem; color: #5c5138; background: #eee6ce; border-radius: 0.5rem; padding: 0.75rem;">
        <div><strong>Página: </strong><span style="word-break: break-all;">${escapeHtml(window.location.href)}</span></div>
        <div><strong>Elemento: </strong>${escapeHtml(tag)}${selector ? ` <code style="color: #b87a22;">${escapeHtml(selector)}</code>` : ''}${text ? ` — "${escapeHtml(text)}"` : ''}</div>
      </dl>
      <label for="aaron-debug-description" style="display: block; font-size: 0.875rem; font-weight: 500; color: #b87a22; margin-bottom: 0.25rem;">Descripción *</label>
      <textarea
        id="aaron-debug-description"
        rows="4"
        style="width: 100%; border-radius: 0.5rem; border: 1px solid #ded0a6; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: #2b2318;"
        placeholder="Ej.: El botón no responde en mobile…"
      ></textarea>
      <p id="aaron-debug-error" style="display: none; font-size: 0.875rem; color: #a23b2e; margin-top: 0.5rem;"></p>
      <input type="text" id="aaron-debug-honeypot" name="website" tabindex="-1" autocomplete="off" style="display: none;" aria-hidden="true" />
      <div style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
        <button type="button" id="aaron-debug-cancel" style="border-radius: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #5c5138; background: transparent; border: none; cursor: pointer;">Cancelar</button>
        <button type="button" id="aaron-debug-submit" style="border-radius: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; color: #fffdf7; background: #b87a22; border: none; cursor: pointer;">Enviar reporte</button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('#aaron-debug-cancel')?.addEventListener('click', close);

  overlay.querySelector('#aaron-debug-submit')?.addEventListener('click', async () => {
    const descriptionEl = overlay.querySelector('#aaron-debug-description') as HTMLTextAreaElement;
    const errorEl = overlay.querySelector('#aaron-debug-error') as HTMLParagraphElement;
    const honeypotEl = overlay.querySelector('#aaron-debug-honeypot') as HTMLInputElement;
    const submitBtn = overlay.querySelector('#aaron-debug-submit') as HTMLButtonElement;

    const description = descriptionEl.value.trim();
    errorEl.style.display = 'none';

    if (!description) {
      errorEl.textContent = 'Ingresa una descripción del problema.';
      errorEl.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    try {
      const debugKey = getDebugKey();
      const payload = {
        description,
        page_url: window.location.href,
        page_path: window.location.pathname + window.location.hash,
        element_tag: tag,
        element_text: text,
        element_selector: selector,
        website: honeypotEl.value,
        ...(debugKey ? { debug_key: debugKey } : {}),
      };

      const result = await submitDebugReport(payload);
      close();
      showToast(`Reporte guardado (${result.file})`);
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : 'No se pudo enviar el reporte.';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar reporte';
    }
  });

  document.body.appendChild(overlay);
  (overlay.querySelector('#aaron-debug-description') as HTMLTextAreaElement)?.focus();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function onMouseMove(e: MouseEvent): void {
  if (!pickMode) return;

  const target = document.elementFromPoint(e.clientX, e.clientY);
  if (!target || isDebugUi(target)) {
    clearHighlight();
    return;
  }

  if (target !== highlightedEl) {
    clearHighlight();
    highlightedEl = target;
    highlightedEl.classList.add('aaron-debug-highlight');
  }
}

function onClickCapture(e: MouseEvent): void {
  if (!pickMode) return;

  const target = e.target as Element;
  if (isDebugUi(target)) return;

  e.preventDefault();
  e.stopPropagation();

  setPickMode(false);
  openReportDialog(target);
}

function createFab(): void {
  if (document.querySelector(`[${DEBUG_UI_ATTR}="fab"]`)) return;

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.setAttribute(DEBUG_UI_ATTR, 'fab');
  fab.style.cssText = `
    position: fixed; bottom: 1rem; right: 1rem; z-index: 9997;
    border-radius: 9999px; background: #b87a22; color: #fffdf7; border: none;
    padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 500; cursor: pointer;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.15);
  `;
  fab.textContent = 'Reportar problema';
  fab.title = 'Modo debug — selecciona un elemento para reportar';

  fab.addEventListener('click', () => {
    if (pickMode) {
      setPickMode(false);
      fab.textContent = 'Reportar problema';
    } else {
      setPickMode(true);
      fab.textContent = 'Cancelar selección';
      showToast('Haz clic en el elemento con problemas');
    }
  });

  document.body.appendChild(fab);
}

export function initDebugMode(): void {
  if (!isDebugActive()) return;

  injectStyles();
  createFab();

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClickCapture, true);
}
