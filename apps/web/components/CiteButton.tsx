"use client";

import { useState } from "react";
import { Check, Quote } from "lucide-react";

type Props = {
  /** Title of the page being cited, such as a person's name. */
  title: string;
  /** Absolute address of the page. */
  url: string;
};

// "Trích dẫn": copies a ready-made citation for the page. Falls back to selecting the text in a
// prompt when the clipboard is unavailable (insecure context, old browser).
export function CiteButton({ title, url }: Props) {
  const [copied, setCopied] = useState(false);
  const today = new Date().toLocaleDateString("vi-VN");
  const text = `"${title}". Sử Phả. ${url} (truy cập ${today}). Giấy phép CC BY-SA 4.0.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Sao chép trích dẫn:", text);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm underline"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Quote className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? "Đã chép trích dẫn" : "Chép trích dẫn"}</span>
    </button>
  );
}
