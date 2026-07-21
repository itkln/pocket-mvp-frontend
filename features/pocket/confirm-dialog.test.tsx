import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ConfirmProvider, useConfirm } from "./confirm-dialog";
import { I18nProvider } from "./i18n";

function ConfirmHarness() {
  const { confirm } = useConfirm();
  return <>
    <button type="button" onClick={async () => {
      const result = await confirm({ description: "Удалить стол 12 с плана?" });
      document.body.dataset.confirmResult = String(result);
    }}>Удалить стол</button>
  </>;
}

const renderDialog = () => render(<I18nProvider><ConfirmProvider><ConfirmHarness /></ConfirmProvider></I18nProvider>);

describe("ConfirmProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.body.dataset.confirmResult;
  });

  it("keeps the item when the user cancels", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Удалить стол" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Удалить стол 12 с плана?");
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));

    await waitFor(() => expect(document.body.dataset.confirmResult).toBe("false"));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("continues with deletion only after confirmation", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Удалить стол" }));
    fireEvent.click(screen.getByRole("button", { name: "Удалить" }));

    await waitFor(() => expect(document.body.dataset.confirmResult).toBe("true"));
  });
});
