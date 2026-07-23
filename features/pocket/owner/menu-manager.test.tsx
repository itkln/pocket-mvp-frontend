import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuManager } from "./menu";

const workspace = {
  categories: [{ id: "category-1", name: "Напитки", sort_order: 0, is_active: true, item_count: 0 }],
  items: [],
  reorderCategories: vi.fn(),
  reorderItems: vi.fn(),
  addItem: vi.fn(),
  editItem: vi.fn(),
  removeItem: vi.fn(),
  removeCategory: vi.fn(),
  editCategory: vi.fn(),
  addCategory: vi.fn(),
};

vi.mock("./context", () => ({
  useOwnerWorkspace: () => workspace,
}));

describe("MenuManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the item search only after the search action is selected", () => {
    render(<MenuManager venueName="Pocket Cafe" onAdd={vi.fn()} notify={vi.fn()} />);

    expect(screen.queryByPlaceholderText("Найти блюдо")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Найти позицию" }));
    const search = screen.getByPlaceholderText("Найти блюдо");
    expect(search).toHaveFocus();

    fireEvent.change(search, { target: { value: "Кофе" } });
    fireEvent.click(screen.getByRole("button", { name: "Закрыть поиск" }));
    expect(screen.queryByPlaceholderText("Найти блюдо")).not.toBeInTheDocument();
  });
});
