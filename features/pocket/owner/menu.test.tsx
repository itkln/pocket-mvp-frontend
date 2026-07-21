import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryManagerDialog } from "./menu";

describe("CategoryManagerDialog", () => {
  it("creates a category inline without opening another dialog", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<CategoryManagerDialog categories={[]} initialCreate onClose={vi.fn()} onRemove={vi.fn()} onSave={onSave} />);

    expect(screen.getByRole("heading", { name: "Управление категориями" })).toBeInTheDocument();
    const input = screen.getByRole("textbox", { name: "Название новой категории" });
    fireEvent.change(input, { target: { value: "Напитки" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить", exact: true }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith([], [{ name: "Напитки", sort_order: 0, is_active: true }]));
  });

  it("adds another editable row inside the same manager", () => {
    render(<CategoryManagerDialog categories={[]} initialCreate={false} onClose={vi.fn()} onRemove={vi.fn()} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Новая категория" }));

    expect(screen.getByRole("textbox", { name: "Название новой категории" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Новая категория" })).not.toBeInTheDocument();
  });
});
