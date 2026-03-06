function tryCoerceType(raw) {
  const value = raw.trim();
  if (value === "") return "";

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }

  if (/^(true|false)$/i.test(value)) {
    return value.toLowerCase() === "true";
  }

  if (/^null$/i.test(value)) {
    return null;
  }

  if (value.includes(",")) {
    const parts = value.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.map((p) => tryCoerceType(p));
    }
  }

  return value;
}

function setNested(obj, path, value) {
  const segments = path.split(".").map((s) => s.trim()).filter(Boolean);
  if (!segments.length) return;

  let current = obj;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;

    if (isLast) {
      if (Object.prototype.hasOwnProperty.call(current, segment)) {
        const existing = current[segment];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          current[segment] = [existing, value];
        }
      } else {
        current[segment] = value;
      }
    } else {
      if (
        !Object.prototype.hasOwnProperty.call(current, segment) ||
        typeof current[segment] !== "object" ||
        current[segment] === null
      ) {
        current[segment] = {};
      }
      current = current[segment];
    }
  }
}

function parseLinesToObject(lines, pairSeparator) {
  const root = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const sepIndex = line.indexOf(pairSeparator);
    if (sepIndex === -1) continue;

    const key = line.slice(0, sepIndex).trim();
    const rawValue = line.slice(sepIndex + pairSeparator.length);
    if (!key) continue;

    const value = tryCoerceType(rawValue);
    setNested(root, key, value);
  }

  return root;
}

function parseLinesToArray(lines, pairSeparator) {
  const objects = [];
  let current = {};

  const flush = () => {
    if (Object.keys(current).length) {
      objects.push(current);
      current = {};
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }

    const sepIndex = line.indexOf(pairSeparator);
    if (sepIndex === -1) {
      continue;
    }

    const key = line.slice(0, sepIndex).trim();
    const rawValue = line.slice(sepIndex + pairSeparator.length);
    if (!key) continue;

    const value = tryCoerceType(rawValue);
    setNested(current, key, value);
  }

  flush();
  return objects;
}

function convertText() {
  const inputEl = document.getElementById("inputText");
  const pairSepEl = document.getElementById("pairSeparator");
  const entrySepEl = document.getElementById("entrySeparator");
  const rootTypeEl = document.getElementById("rootType");
  const outputEl = document.getElementById("jsonOutput");
  const statusEl = document.getElementById("statusBar");

  const raw = inputEl.value || "";
  const pairSeparator = (pairSepEl.value || ":").trim() || ":";
  const entrySeparator = entrySepEl.value;
  const rootType = rootTypeEl.value;

  if (!raw.trim()) {
    outputEl.textContent = "";
    setStatus(statusEl, "Enter some text to convert.", "info");
    return;
  }

  let entries;
  if (entrySeparator === "semicolon") {
    entries = raw.split(";").map((e) => e.replace(/\r?\n/g, " ").trim());
  } else {
    entries = raw.split(/\r?\n/);
  }

  let result;
  if (rootType === "array") {
    result = parseLinesToArray(entries, pairSeparator);
  } else {
    result = parseLinesToObject(entries, pairSeparator);
  }

  try {
    const json = JSON.stringify(result, null, 2);
    outputEl.textContent = json;
    setStatus(statusEl, "Converted successfully.", "success");
  } catch (err) {
    outputEl.textContent = "";
    setStatus(statusEl, "Failed to serialize JSON.", "error");
  }
}

function setStatus(el, message, type) {
  el.textContent = message;
  el.classList.remove("status-bar--success", "status-bar--error");
  if (type === "success") {
    el.classList.add("status-bar--success");
  } else if (type === "error") {
    el.classList.add("status-bar--error");
  }
}

function copyOutput() {
  const outputEl = document.getElementById("jsonOutput");
  const statusEl = document.getElementById("statusBar");
  const text = outputEl.textContent || "";

  if (!text.trim()) {
    setStatus(statusEl, "Nothing to copy.", "error");
    return;
  }

  navigator.clipboard
    .writeText(text)
    .then(() => {
      setStatus(statusEl, "JSON copied to clipboard.", "success");
    })
    .catch(() => {
      setStatus(statusEl, "Could not access clipboard.", "error");
    });
}

function reformatOutput() {
  const outputEl = document.getElementById("jsonOutput");
  const statusEl = document.getElementById("statusBar");
  const text = outputEl.textContent || "";

  if (!text.trim()) return;

  try {
    const parsed = JSON.parse(text);
    outputEl.textContent = JSON.stringify(parsed, null, 2);
    setStatus(statusEl, "Reformatted JSON.", "success");
  } catch {
    setStatus(statusEl, "Output is not valid JSON.", "error");
  }
}

function clearInput() {
  const inputEl = document.getElementById("inputText");
  const outputEl = document.getElementById("jsonOutput");
  const statusEl = document.getElementById("statusBar");
  inputEl.value = "";
  outputEl.textContent = "";
  setStatus(statusEl, "Cleared.", "info");
}

function loadDocJson() {
  const selectEl = document.getElementById("docSelect");
  const outputEl = document.getElementById("jsonOutput");
  const statusEl = document.getElementById("statusBar");

  const fileName = selectEl.value;
  if (!fileName) {
    setStatus(statusEl, "Choose a JSON file first.", "error");
    return;
  }

  const url = `./doc/${fileName}`;

  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      outputEl.textContent = JSON.stringify(data, null, 2);
      setStatus(statusEl, `Loaded ${fileName} from doc folder.`, "success");
    })
    .catch(() => {
      setStatus(
        statusEl,
        "Could not load JSON. If you opened this file directly, try serving the folder with a simple HTTP server.",
        "error"
      );
    });
}

function init() {
  document.getElementById("convertBtn").addEventListener("click", convertText);
  document.getElementById("copyBtn").addEventListener("click", copyOutput);
  document.getElementById("formatBtn").addEventListener("click", reformatOutput);
  document.getElementById("clearInputBtn").addEventListener("click", clearInput);
  document.getElementById("loadDocBtn").addEventListener("click", loadDocJson);

  const inputEl = document.getElementById("inputText");
  inputEl.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
      e.preventDefault();
      convertText();
    }
  });

  convertText();
}

window.addEventListener("DOMContentLoaded", init);

