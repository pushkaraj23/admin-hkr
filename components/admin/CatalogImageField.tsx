"use client";

import { useRef, useState } from "react";
import { AdminApiError, adminApi, adminApiUpload } from "@/lib/admin/client-fetch";

type CatalogImageFolder = "categories" | "products";

type CatalogImageFieldProps = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  folder: CatalogImageFolder;
  entitySlug: string;
  disabled?: boolean;
};

export function CatalogImageField({
  label = "Image",
  value,
  onChange,
  folder,
  entitySlug,
  disabled,
}: CatalogImageFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUrl = value ?? "";
  const slugReady = Boolean(entitySlug.trim());

  async function handleUpload(file: File) {
    if (!slugReady) {
      setError("Enter a slug before uploading an image.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const previous = imageUrl.trim();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      formData.append("slug", entitySlug.trim());

      const res = await adminApiUpload<{ url: string }>("/api/admin/storage/upload", formData);
      onChange(res.url);

      if (previous && previous !== res.url) {
        try {
          await adminApi(`/api/admin/storage/image?url=${encodeURIComponent(previous)}`, { method: "DELETE" });
        } catch {
          /* previous external URL or already removed */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    const current = imageUrl.trim();
    if (!current) {
      onChange("");
      return;
    }
    if (!confirm("Remove this image? Uploaded files will be deleted from storage.")) return;

    setRemoving(true);
    setError(null);
    try {
      try {
        await adminApi(`/api/admin/storage/image?url=${encodeURIComponent(current)}`, { method: "DELETE" });
      } catch (err) {
        if (!(err instanceof AdminApiError && err.status === 404)) {
          throw err;
        }
      }
      onChange("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove image");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase text-caption-foreground">{label}</label>
        <div className="flex rounded-full border border-border bg-muted/40 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("upload")}
            className={`rounded-full px-3 py-1 transition ${mode === "upload" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Upload
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMode("url")}
            className={`rounded-full px-3 py-1 transition ${mode === "url" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            URL
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-row items-start gap-4">
        <CatalogImagePreview
          url={imageUrl}
          size="md"
          onRemove={imageUrl && !disabled ? () => void handleRemove() : undefined}
          removeDisabled={Boolean(disabled) || removing}
          removing={removing}
        />

        <div className="min-w-0 flex-1 space-y-2">
          {mode === "upload" ? (
            <>
              <input
                key="catalog-image-file"
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={Boolean(disabled) || uploading || !slugReady}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary/12 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-primary"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              {!slugReady ? (
                <p className="text-[11px] text-caption-foreground">Set the slug first, then upload.</p>
              ) : (
                <p className="text-[11px] text-caption-foreground">JPEG, PNG, WebP, or GIF · max 8 MB</p>
              )}
              {uploading ? <p className="text-xs text-primary">Uploading…</p> : null}
            </>
          ) : (
            <input
              key="catalog-image-url"
              type="url"
              value={imageUrl}
              disabled={Boolean(disabled)}
              onChange={(e) => onChange(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none ring-ring/30 focus:ring-2"
              placeholder="https://..."
            />
          )}

          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

const previewSizes = {
  sm: "h-20 w-20",
  md: "h-24 w-24",
} as const;

export function CatalogImagePreview({
  url,
  className = "",
  size = "sm",
  showUrl = true,
  onRemove,
  removeDisabled,
  removing,
}: {
  url: string;
  className?: string;
  size?: "sm" | "md";
  showUrl?: boolean;
  onRemove?: () => void;
  removeDisabled?: boolean;
  removing?: boolean;
}) {
  const trimmed = url.trim();
  const frameClass = previewSizes[size];

  if (!trimmed) {
    return (
      <div
        className={`flex shrink-0 ${frameClass} items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-2 text-center text-[10px] leading-snug text-caption-foreground ${className}`}
      >
        No image
      </div>
    );
  }

  return (
    <div className={`w-fit max-w-full shrink-0 ${className}`}>
      <div className={`relative ${frameClass}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trimmed}
          alt="Catalog preview"
          className={`${frameClass} rounded-lg border border-border object-cover bg-muted/20`}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        {onRemove ? (
          <button
            type="button"
            disabled={removeDisabled}
            onClick={onRemove}
            aria-label={removing ? "Removing image" : "Remove image"}
            className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-danger text-white shadow-md transition hover:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {removing ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <RemoveIcon />
            )}
          </button>
        ) : null}
      </div>
      {showUrl ? (
        <p
          className={`mt-1.5 truncate font-mono text-[9px] text-caption-foreground ${size === "md" ? "max-w-[6rem]" : "max-w-[5rem]"}`}
          title={trimmed}
        >
          {trimmed}
        </p>
      ) : null}
    </div>
  );
}

function RemoveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
