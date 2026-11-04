"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";

const MAX_BYTES = 2 * 1024 * 1024;

// A reducao acontece aqui, no navegador, antes de sair da maquina do membro.
// Sai mais barato que converter no servidor (que precisaria de modulo nativo) e
// o que trafega ja e o arquivo pequeno.
async function shrink(file: File, maxSide: number): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // Vai baixando a qualidade ate caber no limite, em vez de recusar o arquivo
  // do membro.
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    if (blob && blob.size <= MAX_BYTES) {
      return new File([blob], "imagem.webp", { type: "image/webp" });
    }
  }

  return file;
}

export function ImageUploadField({
  name,
  label,
  maxSide = 1600,
  currentUrl,
}: {
  name: string;
  label: string;
  maxSide?: number;
  currentUrl?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setInfo("Preparando a imagem...");

    try {
      const reduced = await shrink(file, maxSide);
      const transfer = new DataTransfer();
      transfer.items.add(reduced);
      if (inputRef.current) inputRef.current.files = transfer.files;

      setPreview(URL.createObjectURL(reduced));
      const before = Math.round(file.size / 1024);
      const after = Math.round(reduced.size / 1024);
      setInfo(before === after ? `${after} KB` : `${before} KB reduzida para ${after} KB`);
    } catch {
      setInfo("Nao consegui preparar esta imagem. Tente outro arquivo.");
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setPreview(null);
    setInfo(null);
  }

  return (
    <div className="image-upload">
      <label className="image-upload-trigger">
        <ImagePlus size={16} />
        {label}
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChange}
        />
      </label>

      {preview ? (
        <div className="image-upload-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Previa da imagem escolhida" />
          <button type="button" onClick={clear} aria-label="Remover imagem">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {info ? <p className="muted">{busy ? "Preparando a imagem..." : info}</p> : null}
    </div>
  );
}
