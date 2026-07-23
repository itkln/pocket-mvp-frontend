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

  it("keeps category editing focused on fields without drag controls or extra footer actions", () => {
    render(<CategoryManagerDialog categories={[{ id: "category-1", name: "Напитки", sort_order: 0, item_count: 0, is_active: true }]} initialCreate={false} onClose={vi.fn()} onRemove={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Название категории Напитки" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Переместить категорию/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Новая категория" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Закрыть" })).toHaveLength(1);
  });
});
