"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { IconButton } from "./ui";

export function MenuImageField({ value, name, onChange }: { value: string; name: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const selectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setError("Выберите JPG, PNG или WebP до 10 МБ");
      return;
    }
    setProcessing(true);
    setError("");
    try {
      onChange(await prepareMenuImage(file));
    } catch {
      setError("Не удалось обработать изображение");
    } finally {
      setProcessing(false);
    }
  };

  return <div className={`menu-image-editor ${value ? "has-image" : ""}`}>
    {value ? <div className="food-image" style={{ backgroundImage: `url("${value}")` }} role="img" aria-label={name} /> : <div className="food-image menu-image-placeholder"><span>{name.trim().at(0) || "P"}</span></div>}
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selectImage(event)} />
    <div className="menu-image-actions"><button type="button" onClick={() => input.current?.click()} disabled={processing}><ImagePlus size={17} />{processing ? "Обрабатываем..." : value ? "Изменить фото" : "Добавить фото"}</button>{value && <IconButton icon={Trash2} label="Удалить фото" onClick={() => onChange("")} />}</div>
    {error && <p role="alert">{error}</p>}
  </div>;
}

export const prepareMenuImage = (file: File) => new Promise<string>((resolve, reject) => {
  const objectURL = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const size = Math.min(900, image.naturalWidth, image.naturalHeight);
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - sourceSize) / 2;
    const sourceY = (image.naturalHeight - sourceSize) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(size));
    canvas.height = canvas.width;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(objectURL);
      reject(new Error("Canvas is unavailable"));
      return;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height);
    const firstPass = canvas.toDataURL("image/jpeg", 0.8);
    resolve(firstPass.length <= 650_000 ? firstPass : canvas.toDataURL("image/jpeg", 0.58));
    URL.revokeObjectURL(objectURL);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectURL);
    reject(new Error("Invalid image"));
  };
  image.src = objectURL;
});
