import { appHub, type FileMarkedSuccessData } from "./app-hub";

/** How long to wait for the server to generate a thumb before giving up
 *  and sending anyway (the thumb patches in later via the same event). */
export const FILE_PROCESSING_TIMEOUT_MS = 30000;

const folderToken = (raw: string | undefined): string => {
  if (!raw) return "";
  const noQuery = raw.split("?")[0];
  const idx = noQuery.lastIndexOf("/");
  return idx > 0 ? noQuery.slice(0, idx) : noQuery;
};

export const fileMatchesUpload = (
  data: FileMarkedSuccessData,
  upload: { fileId?: string; key?: string },
): boolean => {
  if (upload.fileId && data.fileId && data.fileId === upload.fileId) return true;
  const candidates = [data.originalKey, data.key, data.originalUrl].filter(Boolean) as string[];
  if (upload.key && candidates.some((c) => c === upload.key)) return true;
  if (!upload.key) return false;
  const uploadToken = folderToken(upload.key);
  if (!uploadToken) return false;
  return candidates.some((c) => {
    const token = folderToken(c);
    return !!token && (token.endsWith(uploadToken) || uploadToken.endsWith(token));
  });
};

/**
 * Resolves when the server finishes processing an uploaded file
 * (ReceiveFileMarkedSuccess); rejects on timeout so callers can fall
 * through and send anyway.
 */
export const waitForFileMarkedSuccess = (
  upload: { fileId?: string; key?: string },
  timeoutMs = FILE_PROCESSING_TIMEOUT_MS,
): Promise<FileMarkedSuccessData> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub();
      reject(new Error("Timed out waiting for file processing"));
    }, timeoutMs);
    const unsub = appHub.onReceiveFileMarkedSuccess((data) => {
      if (!fileMatchesUpload(data, upload)) return;
      clearTimeout(timer);
      unsub();
      resolve(data);
    });
  });
