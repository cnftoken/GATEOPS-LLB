"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { Button, Card } from "./ui";

export function QrTokenCard({ token }: { token: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(token, { width: 512, errorCorrectionLevel: "M" })
      .then((value) => {
        if (active) setUrl(value);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [token]);

  function print(): void {
    if (!url) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const img = win.document.createElement("img");
    img.src = url;
    img.alt = "QR Code gate";
    win.document.body.appendChild(img);
    win.focus();
    win.print();
  }

  return (
    <Card className="mt-4 max-w-lg border-accent/40">
      <p className="text-[15px] font-semibold">Token QR</p>
      <p className="mt-1 text-[13px] text-ink-2">Token mentah hanya ditampilkan satu kali.</p>
      {url ? (
        <Image
          src={url}
          alt="QR Code gate"
          width={512}
          height={512}
          unoptimized
          className="mt-3 h-48 w-48"
        />
      ) : (
        <p className="mt-2 text-[13px] text-ink-2">Menyiapkan QR…</p>
      )}
      <code className="mt-2 block break-all rounded-control bg-app p-3 text-[13px]">{token}</code>
      <div className="mt-3 flex gap-2">
        <a
          href={url ?? "#"}
          download="gate-qr.png"
          className="inline-flex h-11 items-center rounded-control border border-line px-4 text-[15px]"
        >
          Unduh PNG
        </a>
        <Button variant="secondary" onClick={print} disabled={!url}>
          Cetak
        </Button>
      </div>
    </Card>
  );
}
