"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function AffiliateLinkButton({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="copy-link-button" type="button" onClick={copyLink} title={href}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}
