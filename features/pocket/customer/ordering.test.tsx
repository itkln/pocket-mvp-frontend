import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerMenu } from "./ordering";

const renderVenue = (cart: Record<number, number> = {}) => {
  const callbacks = {
    onAdd: vi.fn(),
    onUpdateQty: vi.fn(),
    onCart: vi.fn(),
    onReserve: vi.fn(),
  };
  render(<CustomerMenu cart={cart} {...callbacks} />);
  return callbacks;
};

describe("CustomerMenu venue page", () => {
  it("renders the focused venue sections without overloading the navigation", () => {
    renderVenue();
    expect(screen.getByRole("heading", { name: "North & Vine" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Разделы заведения" })).toHaveTextContent("МенюОтзывыО местеКонтакты");
    expect(screen.getByRole("heading", { name: "Забронировать" })).toBeInTheDocument();
  });

  it("filters the menu and keeps ordering actions connected", () => {
    const { onAdd } = renderVenue();
    fireEvent.click(screen.getByRole("button", { name: "Паста" }));
    expect(screen.getByRole("heading", { name: "Тальятелле с трюфелем" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Сибас на гриле" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));
    expect(onAdd).toHaveBeenCalledWith(1);
  });

  it("continues immediately when the guest skips preorder", () => {
    const { onReserve } = renderVenue();
    expect(screen.getByRole("heading", { name: "В предзаказе пока пусто" })).toBeInTheDocument();
    const continueWithoutPreorder = screen.getByRole("button", { name: "Продолжить без предзаказа" });
    fireEvent.click(continueWithoutPreorder);
    expect(onReserve).toHaveBeenCalledOnce();
  });

  it("allows choosing an exact reservation date from the compact calendar", () => {
    renderVenue();
    const dateTrigger = screen.getByRole("button", { name: /Выбрать дату:/ });
    fireEvent.click(dateTrigger);
    expect(screen.getByRole("dialog", { name: "Выбор даты" })).toBeInTheDocument();
    const availableDates = screen.getAllByRole("button", { name: /\d{4}/ }).filter((button) => !button.hasAttribute("disabled") && button.getAttribute("aria-pressed") === "false");
    fireEvent.click(availableDates[1]);
    expect(screen.queryByRole("dialog", { name: "Выбор даты" })).not.toBeInTheDocument();
    expect(dateTrigger).not.toHaveTextContent("Сегодня");
  });

  it("shows selected menu dishes and total in the same booking card", () => {
    const { onCart } = renderVenue({ 1: 2 });
    expect(screen.getAllByText("Тальятелле с трюфелем")).toHaveLength(2);
    const continueWithPreorder = screen.getByRole("button", { name: /^Продолжить/ });
    expect(continueWithPreorder).toHaveTextContent("€37.00");
    fireEvent.click(continueWithPreorder);
    expect(screen.getAllByText("Тальятелле с трюфелем")).toHaveLength(2);
    const next = screen.getByRole("button", { name: /^Далее/ });
    expect(next).toHaveTextContent("€37.00");
    fireEvent.click(next);
    expect(onCart).toHaveBeenCalledOnce();
  });
});
