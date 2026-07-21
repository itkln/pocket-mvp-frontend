import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "./i18n";
import { Topbar } from "./navigation";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/ru/owner/overview", useRouter: () => ({ replace }) }));

describe("Topbar language menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("switches the whole interface and keeps the selected short code visible", async () => {
    render(<I18nProvider><Topbar
      role="owner"
      screen="overview"
      navigation={[{ id: "overview", label: "Обзор" }]}
      venueName="Pocket"
      cartCount={0}
      onMenu={vi.fn()}
      onCart={vi.fn()}
    /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Язык интерфейса: RU" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "EN English" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Interface language: EN" })).toBeInTheDocument());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(window.localStorage.getItem("pocket:locale")).toBe("en");
    expect(replace).toHaveBeenCalledWith("/en/owner/overview");
  });
});
