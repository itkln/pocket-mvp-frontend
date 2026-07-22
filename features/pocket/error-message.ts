"use client";

import { useCallback } from "react";
import { APIError } from "../../lib/api-client";
import { translate, useI18n } from "./i18n";
import { type Locale } from "./locales";

const errorSourceByCode: Record<string, string> = {
  invalid_request: "Проверьте введенные данные",
  invalid_input: "Проверьте введенные данные",
  account_exists: "Аккаунт с таким e-mail уже существует",
  invalid_credentials: "Неверный e-mail или пароль",
  invalid_reset_token: "Ссылка недействительна или устарела",
  too_many_attempts: "Слишком много попыток. Попробуйте через 15 минут",
  unauthorized: "Требуется вход в аккаунт",
  not_found: "Объект не найден или недоступен",
  conflict: "Такой объект уже существует или используется",
  internal_server_error: "Не удалось выполнить запрос",
  request_failed: "Сервер временно недоступен. Попробуйте еще раз",
};

export function localizedErrorMessage(error: unknown, locale: Locale, fallback = "Не удалось выполнить действие") {
  const source = error instanceof APIError ? errorSourceByCode[error.code] ?? fallback : fallback;
  return translate(source, locale);
}

export function useLocalizedError() {
  const { locale } = useI18n();
  return useCallback((error: unknown, fallback?: string) => localizedErrorMessage(error, locale, fallback), [locale]);
}
