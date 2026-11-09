import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import DishForgotPasswordPage from "../apps/dish/app/[locale]/forgot-password/page";
import DishResetPasswordPage from "../apps/dish/app/[locale]/reset-password/page";
import VendorPage from "../apps/vendor/app/[locale]/[[...route]]/page";
import PasswordRecoveryPage from "./password-recovery-page";

const searchParams = () => Promise.resolve({ token: "single-use-token" });

describe("product-specific password recovery routes", () => {
  it("passes dish from its actual request and confirmation routes", async () => {
    for (const [Page, mode] of [
      [DishForgotPasswordPage, "request"],
      [DishResetPasswordPage, "reset"],
    ] as const) {
      const page = await Page({ searchParams: searchParams() });
      expect(isValidElement(page)).toBe(true);
      expect(page.type).toBe(PasswordRecoveryPage);
      expect(page.props).toMatchObject({ mode, product: "dish" });
      if (mode === "reset") expect(page.props).toHaveProperty("token", "single-use-token");
    }
  });

  it("passes vendor from its actual request and confirmation routes", async () => {
    for (const [route, mode] of [
      ["forgot-password", "request"],
      ["reset-password", "reset"],
    ] as const) {
      const page = await VendorPage({
        params: Promise.resolve({ locale: "sk", route: [route] }),
        searchParams: searchParams(),
      });
      expect(isValidElement(page)).toBe(true);
      expect(page.type).toBe(PasswordRecoveryPage);
      expect(page.props).toMatchObject({ mode, product: "vendor" });
      if (mode === "reset") expect(page.props).toHaveProperty("token", "single-use-token");
    }
  });
});
