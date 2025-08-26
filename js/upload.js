export const ORDER_REF_KEY = "tnf_order_ref";
const DB_NAME = "tnf_uploads";
const STORE = "files";

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) return reject(new Error("IndexedDB not supported"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putFile(key, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).put(record, key);
  });
}
async function getFile(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function delFile(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE).delete(key);
  });
}

function makeNiceRef() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6); // 4 chars
  return `TNF-${y}${m}${day}-${rand}`; // e.g., TNF-250826-7X3K
}

export function ensureOrderRef() {
  let ref = localStorage.getItem(ORDER_REF_KEY);
  if (!ref) {
    ref = makeNiceRef();
    localStorage.setItem(ORDER_REF_KEY, ref);
  }
  return ref;
}

export function getLogoUrlFromTextField(selector = "#logoUrl") {
  const el = document.querySelector(selector);
  return el ? (el.value || "").trim() : "";
}

export function getFileFromInput(selector = "#logoUpload") {
  return document.querySelector(selector)?.files?.[0] || null;
}

export async function savePendingFile(file, orderRef) {
  if (!file) return false;
  const rec = {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified || Date.now(),
    blob: file,
  };
  await putFile(orderRef, rec);
  return true;
}

export async function hasPendingFile(orderRef) {
  const rec = await getFile(orderRef);
  return !!rec;
}

// Submits to Netlify Forms using fetch + FormData
// Requires a hidden form declaration in HTML so Netlify registers the form at build time:
// <form name="tnf-upload" netlify hidden></form>
export async function submitPendingUpload(orderRef, extraFields = {}) {
  const rec = await getFile(orderRef);
  if (!rec) return false;

  const fd = new FormData();
  fd.append("form-name", "tnf-upload");
  fd.append("orderRef", orderRef);
  fd.append("filename", rec.name || "logo");
  fd.append("filetype", rec.type || "application/octet-stream");
  fd.append("filesize", String(rec.size || 0));
  Object.entries(extraFields).forEach(([k, v]) => fd.append(k, v));

  // Recreate a File from the stored Blob
  const file = new File([rec.blob], rec.name || "logo", {
    type: rec.type || "application/octet-stream",
    lastModified: rec.lastModified || Date.now(),
  });
  fd.append("logo", file);

  // Netlify forms work on the same origin in production or via `netlify dev`
  const res = await fetch("/", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");

  await delFile(orderRef); // clear after success
  return true;
}

export async function clearPendingFile(orderRef) {
  try {
    await delFile(orderRef);
  } catch {
    /* noop */
  }
}
