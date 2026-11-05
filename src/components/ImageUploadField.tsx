"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";

const MAX_BYTES = 2 * 1024 * 1024;

// A reducao acontece aqui, no navegador, antes de sair da maquina do membro.
// Sai mais barato que converter no servidor (que precisaria de modulo nativo) e
// o que trafega ja e o arquivo pequeno.
async function shrink(file: File, maxSide: number, quadrada = false): Promise<File> {
  const bitmap = await createImageBitmap(file);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  if (quadrada) {
    // Foto de perfil sai daqui ja quadrada. Antes vinha no formato original e o
    // `object-fit: cover` recortava na hora de exibir — e cover recorta pelo
    // centro geometrico, que numa foto em pe fica no peito da pessoa, nao no
    // rosto. Recortando aqui, com a janela deslocada para cima, o rosto fica
    // enquadrado uma vez so e em todo lugar onde a foto aparece.
    const lado = Math.min(bitmap.width, bitmap.height);
    const recorteX = (bitmap.width - lado) / 2;
    // 20% acima do centro em foto vertical; em foto horizontal nao sobra
    // altura para deslocar, e o Math.max segura no zero.
    const recorteY = Math.max(0, (bitmap.height - lado) / 2 - lado * 0.2);
    const destino = Math.min(maxSide, lado);

    canvas.width = destino;
    canvas.height = destino;
    context.drawImage(bitmap, recorteX, recorteY, lado, lado, 0, 0, destino, destino);
  } else {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }

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
  quadrada = false,
  currentUrl,
}: {
  name: string;
  label: string;
  maxSide?: number;
  quadrada?: boolean;
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
      const reduced = await shrink(file, maxSide, quadrada);
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
