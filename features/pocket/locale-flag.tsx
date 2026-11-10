import { type Locale } from "./locales";

// Interface language flags as inline SVG: emoji flags do not render on Windows.
export function LocaleFlag({ locale }: { locale: Locale }) {
  return (
    <svg
      className="locale-flag"
      viewBox="0 0 30 20"
      width="22"
      height="15"
      aria-hidden="true"
      focusable="false"
    >
      {locale === "en" ? (
        <>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
          <path d="M0 0l30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.6" />
          <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
          <path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.4" />
        </>
      ) : locale === "ua" ? (
        <>
          <rect width="30" height="10" fill="#0057B7" />
          <rect y="10" width="30" height="10" fill="#FFD700" />
        </>
      ) : (
        // Russian and Slovak share the white-blue-red stripes; Slovakia adds its coat of arms.
        <>
          <rect width="30" height="20" fill="#fff" />
          <rect y="6.67" width="30" height="6.67" fill={locale === "sk" ? "#0B4EA2" : "#0039A6"} />
          <rect y="13.33" width="30" height="6.67" fill={locale === "sk" ? "#EE1C25" : "#D52B1E"} />
          {locale === "sk" && (
            <>
              <path
                d="M6 4.5h7v6.2c0 2.6-1.8 4.3-3.5 5.3C7.8 15 6 13.3 6 10.7z"
                fill="#EE1C25"
                stroke="#fff"
                strokeWidth="0.8"
              />
              <path d="M9.5 6.2v6.6M7.6 8h3.8M7.1 9.9h4.8" stroke="#fff" strokeWidth="0.9" />
              <path d="M6.6 13.2c1-.9 1.9-.9 2.9 0 1-.9 1.9-.9 2.9 0" fill="#0B4EA2" />
            </>
          )}
        </>
      )}
    </svg>
  );
}
