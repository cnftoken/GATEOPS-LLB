"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Button } from "./ui";
import { MESSAGES } from "@/lib/messages";

type CameraState = "idle" | "starting" | "running" | "error";

interface Props {
  // paused: jeda kamera saat request berjalan (PRD 10.6).
  paused?: boolean;
  onDecode: (token: string) => void;
}

// Komponen kamera + scan QR (PRD 4, 10.6). Hanya di klien, HTTPS/localhost.
export function CameraScanner({ paused, onDecode }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(paused);
  const lastDecodeRef = useRef<number>(0);
  const [state, setState] = useState<CameraState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setSlowHint(false);
    setState("starting");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("UNSUPPORTED");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      startedAtRef.current = Date.now();

      const loop = () => {
        const v = videoRef.current;
        const canvas = canvasRef.current;
        if (v && canvas && v.readyState === v.HAVE_ENOUGH_DATA) {
          const w = v.videoWidth;
          const h = v.videoHeight;
          if (w && h) {
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(v, 0, 0, w, h);
              const image = ctx.getImageData(0, 0, w, h);
              const code = jsQR(image.data, w, h, { inversionAttempts: "dontInvert" });
              if (code && !pausedRef.current && Date.now() - lastDecodeRef.current > 1500) {
                lastDecodeRef.current = Date.now();
                onDecode(code.data);
              }
            }
          }
          if (startedAtRef.current && Date.now() - startedAtRef.current > 30_000) {
            setSlowHint(true);
          }
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      setState("running");
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const message =
        name === "NotAllowedError" || name === "SecurityError"
          ? "Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu coba lagi."
          : "Kamera gagal dibuka. Periksa perangkat Anda, lalu coba lagi.";
      setError(message);
      setState("error");
    }
  }, [onDecode]);

  useEffect(() => () => stop(), [stop]);

  return (
    <div className="overflow-hidden rounded-card bg-black">
      <div className="relative aspect-[4/3] w-full">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <canvas ref={canvasRef} aria-hidden className="hidden" />
        {state === "running" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-48 w-48 rounded-2xl border-2 border-white/80" />
          </div>
        )}
        {state !== "running" && (
          <div
            role={state === "error" ? "alert" : "status"}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white"
          >
            {state === "error" ? (
              <>
                <p className="text-[15px]">{error ?? MESSAGES.CAMERA_DENIED}</p>
                <Button variant="secondary" onClick={start}>
                  Coba buka kamera lagi
                </Button>
              </>
            ) : (
              <p className="text-[15px]">
                {state === "starting" ? "Membuka kamera…" : "Kamera nonaktif"}
              </p>
            )}
          </div>
        )}
      </div>
      {state === "running" && (
        <div aria-live="polite" className="bg-black/60 p-3 text-center text-[13px] text-white">
          {slowHint
            ? "QR Code tidak terbaca. Pastikan QR berada di dalam bingkai, lalu coba lagi."
            : MESSAGES.SCAN_HINT}
        </div>
      )}
    </div>
  );
}
