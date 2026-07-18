/**
 * Copy text to the clipboard. Works on HTTPS and on plain HTTP (e.g. VPS IP),
 * including inside Radix Dialog/Dropdown portals where a body-mounted
 * textarea cannot receive focus (aria-hidden / focus trap).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy paths.
    }
  }

  if (copyWithCopyEvent(text)) return true;
  return copyWithExecCommand(text);
}

/** Prefer filling clipboardData on the copy event — no focus needed. */
function copyWithCopyEvent(text: string): boolean {
  let written = false;
  const onCopy = (e: ClipboardEvent) => {
    e.clipboardData?.setData("text/plain", text);
    e.preventDefault();
    written = true;
  };

  document.addEventListener("copy", onCopy);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.removeEventListener("copy", onCopy);
  return ok && written;
}

/**
 * Legacy path: temporary textarea. Mount inside the open dialog when present
 * so Radix focus trap / aria-hidden on body does not block selection.
 */
function copyWithExecCommand(text: string): boolean {
  const mount =
    document.querySelector<HTMLElement>('[role="dialog"][data-state="open"]') ??
    document.querySelector<HTMLElement>('[role="dialog"]') ??
    document.body;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("aria-hidden", "true");
  // Must be focusable and selectable (readonly can break copy on some browsers).
  textarea.style.cssText =
    "position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;" +
    "outline:none;box-shadow:none;background:transparent;opacity:0;z-index:2147483647;";

  mount.appendChild(textarea);

  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  mount.removeChild(textarea);

  if (previousRange && selection) {
    selection.removeAllRanges();
    selection.addRange(previousRange);
  }

  return ok;
}
