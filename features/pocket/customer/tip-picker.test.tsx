import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TipDraft } from "../../../lib/gratuity";
import { I18nProvider } from "../i18n";
import { TipPicker } from "./tip-picker";

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

function Picker({
  onChange = vi.fn(),
  initial = { mode: "none" } as TipDraft,
  disabled = false,
}: {
  onChange?: (value: TipDraft) => void;
  initial?: TipDraft;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <I18nProvider initialLocale="ru">
      <TipPicker
        value={value}
        subtotal={1090}
        currency="EUR"
        disabled={disabled}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </I18nProvider>
  );
}

const openCustom = () => fireEvent.click(screen.getByRole("button", { name: "Другая сумма" }));

describe("inline table tips", () => {
  it("shows all presets immediately, defaults to No and applies percentages without a popup", () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);
    expect(screen.getByRole("group", { name: "Чаевые" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Нет" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "5%" })).toHaveTextContent("0,55");
    expect(screen.getByRole("button", { name: "15%" })).toHaveTextContent("1,64");
    expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "10%" }));
    expect(onChange).toHaveBeenLastCalledWith({ mode: "percent", percent: 10 });
    expect(screen.getByRole("button", { name: "10%" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Нет" }));
    expect(onChange).toHaveBeenLastCalledWith({ mode: "none" });
  });

  it("discards unsaved custom edits on close or Escape and restores focus without changing the parent scroll lock", () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} initial={{ mode: "percent", percent: 5 }} />);
    document.body.style.overflow = "auto";
    const trigger = screen.getByRole("button", { name: "Другая сумма" });
    trigger.focus();
    openCustom();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "2,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("auto");
    expect(screen.getByRole("button", { name: "5%" })).toHaveAttribute("aria-pressed", "true");
    openCustom();
    expect(screen.getByRole("textbox")).toHaveValue("");
    const parentKeyDown = vi.fn();
    document.addEventListener("keydown", parentKeyDown);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(parentKeyDown).not.toHaveBeenCalled();
    document.removeEventListener("keydown", parentKeyDown);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    document.body.style.overflow = "";
  });

  it("opens only the custom amount editor, validates cents and saves with Enter without submitting the order", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <Picker onChange={onChange} />
      </form>,
    );
    openCustom();
    const dialog = within(screen.getByRole("dialog", { name: "Сумма чаевых" }));
    expect(dialog.queryByRole("button", { name: "Назад" })).not.toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: "10%" })).not.toBeInTheDocument();
    const input = dialog.getByRole("textbox", { name: "Сумма чаевых · EUR" });
    expect(input).toHaveFocus();
    expect(dialog.getByRole("button", { name: "Сохранить" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "1.234" } });
    expect(dialog.getByRole("alert")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "1,23" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ mode: "custom", value: "1,23" });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Другая сумма" })).toHaveTextContent("1,23");
    expect(screen.getByRole("button", { name: "Другая сумма" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    openCustom();
    expect(screen.getByRole("textbox")).toHaveValue("1,23");
  });

  it("locks all tip controls while submitting an order", () => {
    render(<Picker disabled />);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });
});
