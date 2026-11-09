import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrderAlertSettingsDialog } from "./order-alert-settings";
import { defaultOrderAlerts } from "./order-waiting";
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
it("rejects reversed thresholds and saves venue settings", async () => {
  const save = vi.fn().mockResolvedValue(undefined),
    close = vi.fn();
  render(<OrderAlertSettingsDialog value={defaultOrderAlerts} onSave={save} onClose={close} />);
  const fields = screen.getAllByLabelText("Через минут");
  fireEvent.change(fields[0], { target: { value: "25" } });
  expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  fireEvent.change(fields[1], { target: { value: "35" } });
  fireEvent.change(screen.getByLabelText("Начинать готовку до визита, мин"), {
    target: { value: "45" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        warning_minutes: 25,
        critical_minutes: 35,
        preorder_lead_minutes: 45,
      }),
    ),
  );
  expect(close).toHaveBeenCalledOnce();
});
