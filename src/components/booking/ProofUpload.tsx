"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { browserClient } from "@/lib/db/browser";

const BUCKET = "payment-proofs";

export function ProofUpload({
  manageToken,
  onDone,
}: {
  manageToken: string;
  onDone?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("uploading");
    setError(null);
    try {
      const { uploadUrl, token, path } = await apiFetch<{ uploadUrl: string; token: string; path: string }>(
        `/api/manage/${manageToken}/payment-proof`,
        { method: "POST", json: { action: "sign", filename: file.name } },
      );
      void uploadUrl;
      const { error: upErr } = await browserClient()
        .storage.from(BUCKET)
        .uploadToSignedUrl(path, token, file);
      if (upErr) throw upErr;
      await apiFetch(`/api/manage/${manageToken}/payment-proof`, {
        method: "POST",
        json: { action: "confirm", path },
      });
      setStatus("done");
      onDone?.();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  if (status === "done") {
    return (
      <p className="rounded-md border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">
        ✓ Screenshot received. Our team will verify your payment shortly.
      </p>
    );
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface-2 px-4 py-2 text-sm font-medium transition hover:bg-surface-3">
        {status === "uploading" ? "Uploading…" : "Upload payment screenshot"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={status === "uploading"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </label>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
