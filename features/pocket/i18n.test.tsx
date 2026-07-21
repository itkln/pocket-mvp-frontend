import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, translate, useI18n } from "./i18n";

function LanguageHarness() {
  const { setLocale } = useI18n();
  return <>
    <button type="button" onClick={() => setLocale("en")}>English</button>
    <h1>Заказы</h1>
    <input aria-label="Поиск по команде" placeholder="Поиск по команде" />
  </>;
}

describe("global localization", () => {
  beforeEach(() => window.localStorage.clear());

  it("translates static and parameterized interface text", () => {
    expect(translate("Заказы", "en")).toBe("Orders");
    expect(translate("Удалить стол {id} с плана?", "uk", { id: "12" })).toBe("Видалити стіл 12 з плану?");
    expect(translate("Заказы", "sk")).toBe("Objednávky");
    expect(translate("Успешных платежей: 4", "en")).toBe("Successful payments: 4");
    expect(translate("E2E Bistro / Управление", "en")).toBe("E2E Bistro / Management");
    expect(translate("3 отзывов", "sk")).toBe("3 recenzií");
    expect(translate("Стол 08 · у окна · до 6 гостей", "sk")).toBe("Stôl 08 · pri okne · do 6 hostí");
  });

  it("updates text and accessible field labels across the document", async () => {
    render(<I18nProvider><LanguageHarness /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: "English" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Orders" })).toBeInTheDocument());
    expect(screen.getByPlaceholderText("Search the team")).toHaveAttribute("aria-label", "Search the team");
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(window.localStorage.getItem("pocket:locale")).toBe("en");
  });
});
