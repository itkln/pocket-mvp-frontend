import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuManager } from "./menu";
import type { OwnerMenuItem } from "../../../lib/owner-api";

const nutritionItem: OwnerMenuItem = { id: "dish", category_id: "category-1", category: "Напитки", name: "Чай", price_minor: 300, currency: "EUR", is_available: true, is_popular: false, sort_order: 2, portion_weight_g: 200, energy_kcal: 10, protein_g: 0, fat_g: 0, carbs_g: 2.5 };

const workspace = {
  categories: [{ id: "category-1", name: "Напитки", sort_order: 0, is_active: true, preorder_enabled: true, item_count: 0 }],
  items: [] as OwnerMenuItem[],
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
    workspace.items = [];
    workspace.editItem.mockResolvedValue(undefined);
  });

  it("preserves nutrition when publishing, highlighting and duplicating an item", async () => {
    workspace.items = [nutritionItem];
    render(<MenuManager venueName="Pocket Cafe" onAdd={vi.fn()} notify={vi.fn()} />);
    const row = document.querySelector(".menu-product-row")! as HTMLElement;
    fireEvent.click(within(row).getByRole("checkbox"));
    expect(workspace.editItem).toHaveBeenLastCalledWith("dish", expect.objectContaining({ is_available: false, energy_kcal: 10, protein_g: 0, fat_g: 0, carbs_g: 2.5, portion_weight_g: 200, sort_order: 2 }));
    fireEvent.click(within(row).getByRole("button", { name: "Действия с позицией" }));
    fireEvent.click(screen.getByRole("button", { name: "Отметить как «Хит»" }));
    await waitFor(() => expect(workspace.editItem).toHaveBeenLastCalledWith("dish", expect.objectContaining({ is_popular: true, energy_kcal: 10, fat_g: 0 })));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Создать копию" })).not.toBeInTheDocument());
    fireEvent.click(within(row).getByRole("button", { name: "Действия с позицией" }));
    fireEvent.click(screen.getByRole("button", { name: "Создать копию" }));
    expect(workspace.addItem).toHaveBeenCalledWith(expect.objectContaining({ name: "Чай — копия", energy_kcal: 10, fat_g: 0, portion_weight_g: 200 }));
  });

  it("edits nutrition and explicitly clears a value in the owner form", async () => {
    workspace.items = [nutritionItem];
    render(<MenuManager venueName="Pocket Cafe" onAdd={vi.fn()} notify={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Редактировать позицию" }));
    expect(screen.getByLabelText("Жиры, г")).toHaveValue(0);
    fireEvent.change(screen.getByLabelText("Белки, г"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Калории, ккал"), { target: { value: "20.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(workspace.editItem).toHaveBeenCalledWith("dish", expect.objectContaining({ protein_g: null, energy_kcal: 20.5, fat_g: 0, carbs_g: 2.5, portion_weight_g: 200 })));
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

  it("edits categories inside the category column and collapses each mobile block", () => {
    render(<MenuManager venueName="Pocket Cafe" onAdd={vi.fn()} notify={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Редактировать категории" }));

    expect(screen.getByRole("textbox", { name: "Название категории Напитки" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Управление категориями" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Свернуть категории" }));
    expect(screen.getByRole("button", { name: "Развернуть категории" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Свернуть позиции" }));
    expect(screen.getByRole("button", { name: "Развернуть позиции" })).toBeInTheDocument();
  });

  it("can create a category again after removing an unsaved draft", async () => {
    render(<MenuManager venueName="Pocket Cafe" onAdd={vi.fn()} notify={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Добавить категорию" }));
    expect(screen.getByRole("textbox", { name: "Название новой категории" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Удалить новую категорию" }));
    expect(screen.queryByRole("textbox", { name: "Название новой категории" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Добавить категорию" }));
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Название новой категории" })).toBeInTheDocument());
  });
});
