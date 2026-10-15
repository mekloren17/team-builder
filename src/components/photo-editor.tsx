"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "player-photos";
const VIEW = 256; // crop window on screen, px
const OUTPUT = 320; // saved photo, px (square)

export type PhotoTarget = { kind: "me"; userId: string } | { kind: "guest"; playerId: string };

interface Crop {
  img: HTMLImageElement;
  src: string;
  zoom: number; // 1 = the image just covers the square
  x: number; // top-left of the scaled image, relative to the crop window
  y: number;
}

/**
 * Pick a photo, frame the face by dragging and zooming, then upload a small square WebP.
 * `save` stores the new URL on the card (null removes the photo).
 */
export function PhotoEditor({
  target,
  currentUrl,
  save,
  onSaved,
}: {
  target: PhotoTarget;
  currentUrl: string | null;
  save: (url: string | null) => Promise<{ error?: string } | void>;
  onSaved?: (url: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  function baseScale(img: HTMLImageElement) {
    return VIEW / Math.min(img.naturalWidth, img.naturalHeight);
  }

  function clampPos(c: Crop, x: number, y: number) {
    const s = baseScale(c.img) * c.zoom;
    return {
      x: Math.min(0, Math.max(VIEW - c.img.naturalWidth * s, x)),
      y: Math.min(0, Math.max(VIEW - c.img.naturalHeight * s, y)),
    };
  }

  function pick(file: File) {
    setError(null);
    const src = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = baseScale(img);
      setCrop({ img, src, zoom: 1, x: (VIEW - img.naturalWidth * s) / 2, y: (VIEW - img.naturalHeight * s) / 2 });
    };
    img.onerror = () => setError("This file doesn't look like a photo.");
    img.src = src;
  }

  function setZoom(zoom: number) {
    if (!crop) return;
    // keep the centre of the window on the same point of the photo
    const before = baseScale(crop.img) * crop.zoom;
    const after = baseScale(crop.img) * zoom;
    const cx = (VIEW / 2 - crop.x) / before;
    const cy = (VIEW / 2 - crop.y) / before;
    const next = { ...crop, zoom };
    setCrop({ ...next, ...clampPos(next, VIEW / 2 - cx * after, VIEW / 2 - cy * after) });
  }

  function close() {
    if (crop) URL.revokeObjectURL(crop.src);
    setCrop(null);
    if (input.current) input.current.value = "";
  }

  async function persist(url: string | null) {
    const result = await save(url);
    if (result?.error) {
      setError(result.error);
      return;
    }
    await removeOld(currentUrl);
    onSaved?.(url);
    close();
  }

  function upload() {
    if (!crop) return;
    setError(null);
    startBusy(async () => {
      const blob = await render(crop);
      const folder = target.kind === "me" ? `users/${target.userId}` : `guests/${target.playerId}`;
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      await persist(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
    });
  }

  const s = crop ? baseScale(crop.img) * crop.zoom : 1;

  return (
    <div className="space-y-2">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="h-11 rounded-full border border-zinc-300 px-5 font-medium dark:border-zinc-700"
        >
          {currentUrl ? "Change photo" : "Add photo"}
        </button>
        {currentUrl && (
          <button type="button" onClick={() => startBusy(() => persist(null))} disabled={busy} className="text-sm text-zinc-500 underline">
            Remove
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}

      {crop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-background p-5">
            <h2 className="text-lg font-semibold">Frame your face</h2>
            <div
              className="relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-zinc-200"
              style={{ width: VIEW, height: VIEW }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { px: e.clientX, py: e.clientY, x: crop.x, y: crop.y };
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d) return;
                setCrop({ ...crop, ...clampPos(crop, d.x + e.clientX - d.px, d.y + e.clientY - d.py) });
              }}
              onPointerUp={() => (drag.current = null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={crop.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.img.naturalWidth * s,
                  height: crop.img.naturalHeight * s,
                }}
              />
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-zinc-500">Zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={crop.zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <p className="text-sm text-zinc-500">Drag the photo to move it.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={close}
                className="h-11 flex-1 rounded-full border border-zinc-300 font-medium dark:border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={upload}
                disabled={busy}
                className="h-11 flex-1 rounded-full bg-foreground font-medium text-background disabled:opacity-50"
              >
                {busy ? "Saving…" : "Use photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Draws the framed square at OUTPUT px; WebP where the browser can encode it, else JPEG. */
async function render(c: Crop): Promise<Blob> {
  const s = (VIEW / Math.min(c.img.naturalWidth, c.img.naturalHeight)) * c.zoom;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = OUTPUT;
  canvas.getContext("2d")!.drawImage(c.img, -c.x / s, -c.y / s, VIEW / s, VIEW / s, 0, 0, OUTPUT, OUTPUT);
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
  const webp = await toBlob("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  return (await toBlob("image/jpeg"))!;
}

/** Deletes a replaced photo from our bucket (Google pictures are left alone). Best effort. */
async function removeOld(url: string | null) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  if (!url || !url.includes(marker)) return;
  await createClient().storage.from(BUCKET).remove([url.split(marker)[1]]);
}
