import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MenuManager } from "./menu";
import type { OwnerMenuItem } from "../../../lib/owner-api";

const nutritionItem: OwnerMenuItem = {
  id: "dish",
  category_id: "category-1",
  category: "Напитки",
  name: "Чай",
  price_minor: 300,
  currency: "EUR",
  is_available: true,
  is_popular: false,
  sort_order: 2,
  portion_weight_g: 200,
  energy_kcal: 10,
  protein_g: 0,
  fat_g: 0,
  carbs_g: 2.5,
};
const category = {
  id: "category-1",
  name: "Напитки",
  sort_order: 0,
  is_active: true,
  preorder_enabled: false,
  item_count: 1,
};
const workspace = {
  categories: [category],
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
vi.mock("./context", () => ({ useOwnerWorkspace: () => workspace }));

beforeEach(() => {
  vi.clearAllMocks();
  workspace.categories = [{ ...category }];
  workspace.items = [];
  for (const operation of [
    workspace.editItem,
    workspace.addItem,
    workspace.editCategory,
    workspace.addCategory,
  ])
    operation.mockResolvedValue(undefined);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
const renderMenu = () => render(<MenuManager venueName="Pocket Cafe" notify={vi.fn()} />);

describe("MenuManager", () => {
  it("preserves nutrition when publishing, highlighting and duplicating an item", async () => {
    workspace.items = [nutritionItem];
    renderMenu();
    const row = document.querySelector(".vendor-menu-row")! as HTMLElement;
    fireEvent.click(within(row).getByRole("checkbox"));
    await waitFor(() =>
      expect(workspace.editItem).toHaveBeenLastCalledWith(
        "dish",
        expect.objectContaining({
          is_available: false,
          energy_kcal: 10,
          protein_g: 0,
          fat_g: 0,
          carbs_g: 2.5,
          portion_weight_g: 200,
          sort_order: 2,
        }),
      ),
    );
    await waitFor(() => expect(within(row).getByRole("checkbox")).toBeEnabled());
    fireEvent.click(within(row).getByRole("button", { name: "Действия с позицией Чай" }));
    fireEvent.click(screen.getByRole("button", { name: "Отметить как «Хит»" }));
    await waitFor(() =>
      expect(workspace.editItem).toHaveBeenLastCalledWith(
        "dish",
        expect.objectContaining({ is_popular: true, energy_kcal: 10, fat_g: 0 }),
      ),
    );
    await waitFor(() => expect(within(row).getByRole("checkbox")).toBeEnabled());
    fireEvent.click(within(row).getByRole("button", { name: "Действия с позицией Чай" }));
    fireEvent.click(screen.getByRole("button", { name: "Создать копию" }));
    await waitFor(() =>
      expect(workspace.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Чай — копия",
          is_available: false,
          energy_kcal: 10,
          fat_g: 0,
          portion_weight_g: 200,
        }),
      ),
    );
  });
  it("edits nutrition in the drawer and explicitly clears a value", async () => {
    workspace.items = [nutritionItem];
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Редактировать Чай" }));
    expect(screen.getByRole("dialog", { name: "Чай" })).toBeInTheDocument();
    expect(screen.getByLabelText("Жиры, г")).toHaveValue(0);
    fireEvent.change(screen.getByLabelText("Белки, г"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Калории, ккал"), { target: { value: "20.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() =>
      expect(workspace.editItem).toHaveBeenCalledWith(
        "dish",
        expect.objectContaining({
          protein_g: null,
          energy_kcal: 20.5,
          fat_g: 0,
          carbs_g: 2.5,
          portion_weight_g: 200,
          sort_order: 2,
        }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("shows only the selected category and filters its items", () => {
    workspace.categories.push({ ...category, id: "category-2", name: "Десерты" });
    workspace.items = [
      nutritionItem,
      {
        ...nutritionItem,
        id: "cake",
        name: "Торт",
        category_id: "category-2",
        image_url: "/cake.jpg",
      },
    ];
    renderMenu();
    expect(screen.getByRole("button", { name: "Редактировать Чай" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редактировать Торт" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Десерты.*Позиций/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Поиск по меню" }), {
      target: { value: "Торт" },
    });
    expect(screen.getByRole("button", { name: "Редактировать Торт" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редактировать Чай" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Очистить поиск" }));
    fireEvent.click(screen.getByRole("button", { name: /Напитки.*Позиций/ }));
    fireEvent.click(screen.getByRole("button", { name: /Фотографии в меню/ }));
    expect(screen.getByRole("button", { name: "Редактировать Чай" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редактировать Торт" })).not.toBeInTheDocument();
  });
  it("includes enabled dishes in disabled categories and restores availability without changing preorder", async () => {
    workspace.categories = [{ ...category, is_active: false }];
    workspace.items = [
      nutritionItem,
      { ...nutritionItem, id: "coffee", name: "Кофе", is_available: false },
    ];
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: /Стоп-лист/ }));
    expect(screen.getByRole("button", { name: "Редактировать Чай" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Редактировать Кофе" })).toBeInTheDocument();
    fireEvent.click(
      within(document.querySelector(".vendor-stop-summary")! as HTMLElement).getByRole("button", {
        name: "Включить все",
      }),
    );
    await waitFor(() =>
      expect(workspace.editCategory).toHaveBeenCalledWith(
        "category-1",
        expect.objectContaining({ is_active: true, preorder_enabled: false }),
      ),
    );
    await waitFor(() => expect(workspace.editItem).toHaveBeenCalledTimes(1));
    expect(workspace.editItem).toHaveBeenCalledWith(
      "coffee",
      expect.objectContaining({ is_available: true, energy_kcal: 10 }),
    );
  });
  it("creates a position in the selected category using the drawer", async () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Добавить" }));
    fireEvent.change(screen.getByLabelText("Название", { exact: true }), {
      target: { value: "Кофе" },
    });
    fireEvent.change(screen.getByLabelText("Цена · EUR"), { target: { value: "4.50" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить в меню" }));
    await waitFor(() =>
      expect(workspace.addItem).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Кофе",
          category_id: "category-1",
          price_minor: 450,
          currency: "EUR",
          is_available: true,
        }),
      ),
    );
  });
  it("keeps a failed edit open with the draft intact", async () => {
    workspace.items = [nutritionItem];
    workspace.editItem.mockRejectedValue(new Error("Failed"));
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Редактировать Чай" }));
    fireEvent.change(screen.getByLabelText("Название", { exact: true }), {
      target: { value: "Новый чай" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByLabelText("Название", { exact: true })).toHaveValue("Новый чай");
  });
  it("keeps category creation outside category settings", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Редактировать категории" }));
    expect(screen.getByRole("textbox", { name: "Название категории Напитки" })).toBeInTheDocument();
    expect(screen.getByText("Показывать в меню")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Добавить категорию" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Новая категория" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть редактирование категорий" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить категорию" }));
    expect(screen.getByRole("textbox", { name: "Название новой категории" })).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Название категории Напитки" }),
    ).not.toBeInTheDocument();
  });
  it("can create a category again after removing an unsaved draft", async () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Добавить категорию" }));
    expect(screen.getByRole("textbox", { name: "Название новой категории" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Удалить новую категорию" }));
    fireEvent.click(screen.getByRole("button", { name: "Добавить категорию" }));
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Название новой категории" })).toBeInTheDocument(),
    );
  });
});
