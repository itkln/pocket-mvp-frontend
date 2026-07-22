import { describe, expect, it } from "vitest";
import { APIError } from "../../lib/api-client";
import { localizedErrorMessage } from "./error-message";

describe("localized API errors", () => {
  it.each([
    ["ru", "Неверный e-mail или пароль"],
    ["en", "Incorrect e-mail or password"],
    ["ua", "Неправильний e-mail або пароль"],
    ["sk", "Nesprávny e-mail alebo heslo"],
  ] as const)("renders an API error in %s", (locale, expected) => {
    const error = new APIError("invalid_credentials", "Сообщение сервера на русском", 401);
    expect(localizedErrorMessage(error, locale)).toBe(expected);
  });

  it("never exposes an unknown server message", () => {
    const error = new APIError("future_error", "Внутренняя ошибка базы данных", 500);
    expect(localizedErrorMessage(error, "en")).toBe("The action could not be completed");
  });
});
