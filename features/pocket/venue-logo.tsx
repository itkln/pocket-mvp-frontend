"use client";

import Image from "next/image";
import { useState } from "react";
import { useI18n } from "./i18n";

export function VenueLogo({
  venueID,
  name,
  imageURL,
}: {
  venueID: string;
  name: string;
  imageURL?: string;
}) {
  const { t } = useI18n();
  const [failedURL, setFailedURL] = useState<string>();
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const initials =
    (words.length > 1 ? words.filter((word) => word.toLowerCase() !== "pocket") : words)
      .slice(0, 2)
      .map((word) => Array.from(word)[0])
      .join("")
      .toLocaleUpperCase() || "P";
  const hue = Array.from(venueID).reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 360, 0);
  const label = t("Иконка заведения: {name}", { name });
  return (
    <span
      className={`venue-logo ${imageURL && imageURL !== failedURL ? "venue-logo-custom" : "venue-logo-monogram"}`}
      style={{ backgroundColor: `hsl(${hue} 18% 95%)`, color: `hsl(${hue} 20% 30%)` }}
    >
      {imageURL && imageURL !== failedURL ? (
        <Image
          src={imageURL}
          alt={label}
          width={96}
          height={96}
          unoptimized
          onError={() => setFailedURL(imageURL)}
        />
      ) : (
        <span role="img" aria-label={label}>
          {initials}
        </span>
      )}
    </span>
  );
}
