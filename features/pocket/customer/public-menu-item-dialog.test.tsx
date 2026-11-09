import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { PublicMenuItemDialog } from "./public-menu-item-dialog";

const item = { id: "dish", name: "Тестовое блюдо", description: "Описание блюда", price_minor: 950, currency: "EUR", image_url: "/dish.jpg", portion_weight_g: 250, energy_kcal: 196, protein_g: 8, fat_g: 0, carbs_g: 28 };

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

describe("dish information", () => {
  it("shows nutrition per 100 g, including zero, without offering standalone ordering", () => {
    render(<I18nProvider initialLocale="ru"><PublicMenuItemDialog item={item} onClose={vi.fn()} /></I18nProvider>);
    const nutrition = screen.getByRole("region", { name: "Пищевая ценность" });
    expect(within(nutrition).getByText("На 100 г")).toBeInTheDocument();
    for (const value of ["196", "8г", "0г", "28г"]) expect(within(nutrition).getByText(value)).toBeInTheDocument();
    expect(screen.getByText("250 г")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Добавить" })).not.toBeInTheDocument();
  });

  it("does not invent missing values and closes on native Escape", () => {
    const close = vi.fn();
    render(<I18nProvider initialLocale="ru"><PublicMenuItemDialog item={{ id: "dish", name: "Блюдо", price_minor: 100, currency: "EUR" }} onClose={close} /></I18nProvider>);
    expect(screen.queryByRole("region", { name: "Пищевая ценность" })).not.toBeInTheDocument();
    expect(screen.queryByText("На 100 г")).not.toBeInTheDocument();
    expect(screen.queryByText("Заведение пока не указало КБЖУ")).not.toBeInTheDocument();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: false, cancelable: true }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("shows only provided nutrition values and treats zero as a provided value", () => {
    render(<I18nProvider initialLocale="ru"><PublicMenuItemDialog item={{ id: "dish", name: "Блюдо", price_minor: 100, currency: "EUR", fat_g: 0 }} onClose={vi.fn()} /></I18nProvider>);
    const nutrition = screen.getByRole("region", { name: "Пищевая ценность" });
    expect(within(nutrition).getByText("жиры")).toBeInTheDocument();
    expect(within(nutrition).getByText("0г")).toBeInTheDocument();
    for (const label of ["ккал", "белки", "углеводы", "—"]) expect(within(nutrition).queryByText(label)).not.toBeInTheDocument();
  });

  it("updates the add button total with the chosen quantity and adds that quantity", () => {
    const add = vi.fn();
    const close = vi.fn();
    render(<I18nProvider initialLocale="ru"><PublicMenuItemDialog item={item} onClose={close} onAddToPreorder={add} /></I18nProvider>);
    expect(screen.getByRole("button", { name: /^Добавить/ })).toHaveTextContent("9,50");
    fireEvent.click(screen.getByRole("button", { name: "Увеличить количество" }));
    const action = screen.getByRole("button", { name: /^Добавить/ });
    expect(action).toHaveTextContent("19,00");
    fireEvent.click(action);
    expect(add).toHaveBeenCalledWith(2);
    expect(close).toHaveBeenCalledOnce();
  });
});
