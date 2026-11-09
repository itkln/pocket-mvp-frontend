import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { SlideToConfirm } from "./slide-to-confirm";

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    pointerId: number;
    isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true; }
  });
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => true;
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

function show(onConfirm = vi.fn(async () => {}), disabled = false) {
  const view = render(<I18nProvider initialLocale="ru"><SlideToConfirm amount="12,00 €" disabled={disabled} onConfirm={onConfirm} /></I18nProvider>);
  const button = screen.getByRole("button", { name: /^Отправить заказ/ });
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, width: 360, height: 72, top: 0, left: 0, right: 360, bottom: 72, toJSON: () => ({}) });
  return { button, onConfirm, rerender: view.rerender };
}
function swipe(button: HTMLElement, endX: number) {
  fireEvent.pointerDown(button, { clientX: 36, pointerId: 1, isPrimary: true, button: 0 });
  fireEvent.pointerMove(button, { clientX: endX, pointerId: 1 });
  fireEvent.pointerUp(button, { clientX: endX, pointerId: 1 });
}

describe("slide to confirm a table order", () => {
  it("uses an ordinary desktop button and prevents duplicate submissions while pending", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    let finish!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { button } = show(onConfirm);
    expect(screen.queryByText("Сдвиньте для подтверждения")).not.toBeInTheDocument();
    expect(button).not.toHaveAttribute("aria-describedby");
    fireEvent.click(button, { detail: 1 });
    fireEvent.click(button, { detail: 1 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => finish());
    expect(button).toBeEnabled();
  });

  it("does not submit on a tap, an incomplete swipe, or dragging from the label", () => {
    const { button, onConfirm } = show();
    fireEvent.click(button, { detail: 1 });
    swipe(button, 150);
    expect(button.style.getPropertyValue("--slide-offset")).toBe("0px");
    fireEvent.pointerDown(button, { clientX: 160, pointerId: 1, isPrimary: true, button: 0 });
    fireEvent.pointerUp(button, { clientX: 350, pointerId: 1 });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("submits exactly once on release at the end and resets after the request finishes", async () => {
    let finish!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { button } = show(onConfirm);
    fireEvent.pointerDown(button, { clientX: 36, pointerId: 1, isPrimary: true, button: 0 });
    fireEvent.pointerMove(button, { clientX: 350, pointerId: 1 });
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.pointerUp(button, { clientX: 350, pointerId: 1 });
    fireEvent.click(button, { detail: 1 });
    swipe(button, 350);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await act(async () => finish());
    expect(button).toBeEnabled();
    expect(button.style.getPropertyValue("--slide-offset")).toBe("0px");
    swipe(button, 350);
    expect(onConfirm).toHaveBeenCalledTimes(2);
    await act(async () => finish());
  });

  it("cancels safely on pointer cancellation or Escape even after reaching the end", () => {
    const { button, onConfirm } = show();
    for (const cancel of [() => fireEvent.pointerCancel(button, { pointerId: 1 }), () => fireEvent.keyDown(button, { key: "Escape" })]) {
      fireEvent.pointerDown(button, { clientX: 36, pointerId: 1, isPrimary: true, button: 0 });
      fireEvent.pointerMove(button, { clientX: 350, pointerId: 1 });
      cancel();
      fireEvent.pointerUp(button, { clientX: 350, pointerId: 1 });
      expect(button.style.getPropertyValue("--slide-offset")).toBe("0px");
    }
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("supports native keyboard/assistive activation and honours the disabled state", async () => {
    const { button, onConfirm, rerender } = show();
    // Keyboard and screen-reader activation generates a click with detail=0.
    fireEvent.click(button, { detail: 0 });
    await waitFor(() => expect(button).toBeEnabled());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    rerender(<I18nProvider initialLocale="ru"><SlideToConfirm amount="12,00 €" disabled onConfirm={onConfirm} /></I18nProvider>);
    swipe(button, 350);
    fireEvent.click(button, { detail: 0 });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
