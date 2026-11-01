"use client";

import { useEffect, useRef, useState } from "react";
import { CONTACT } from "@/contact";
import type { Dictionary } from "@/i18n";
import { TelegramIcon, WhatsAppIcon } from "../icons";

/** "Contact me" button: a click opens a card with email, phone, WhatsApp and Telegram; leaving it with the mouse, a tap outside or Escape closes it. */
export function Contact({ t }: { t: Dictionary["header"] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const row = "flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-ink no-underline hover:bg-soft";
  const app = "btn flex flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-line py-2 text-[14px] text-ink no-underline";
  return (
    <div ref={box} data-testid="contact" className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="btn flex min-h-11 cursor-pointer items-center rounded-full border-[1.5px] border-line bg-card px-4 text-[15px] font-semibold text-ink"
      >
        {t.contact}
      </button>
      {open && (
        <div className="absolute end-0 top-full z-30 pt-2">
          <div className="flex w-[280px] flex-col gap-1 rounded-2xl border-2 border-line bg-card p-3 shadow-[5px_5px_0_var(--line)]">
            <a href={`mailto:${CONTACT.email}`} className={row}>
              <span className="text-muted">{t.email}</span>
              <span dir="ltr" className="ms-auto font-mono text-[13px]">
                {CONTACT.email}
              </span>
            </a>
            <a href={`tel:${CONTACT.phone}`} className={row}>
              <span className="text-muted">{t.phone}</span>
              <span dir="ltr" className="ms-auto font-mono text-[14px]">
                {CONTACT.phoneDisplay}
              </span>
            </a>
            <div className="mt-1 flex gap-2">
              <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" className={app}>
                <WhatsAppIcon /> WhatsApp
              </a>
              <a href={CONTACT.telegram} target="_blank" rel="noreferrer" className={app}>
                <TelegramIcon /> Telegram
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
