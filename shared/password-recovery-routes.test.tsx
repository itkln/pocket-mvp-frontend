import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import DishPage from "../apps/dish/app/[locale]/[[...route]]/page";
import VendorPage from "../apps/vendor/app/[locale]/[[...route]]/page";
import PasswordRecoveryPage from "./password-recovery-page";

describe("product-specific password recovery routes", () => {
  for (const [product, Page] of [
    ["dish", DishPage],
    ["vendor", VendorPage],
  ] as const) {
    it(`passes ${product} from its actual request and confirmation routes`, async () => {
      for (const [route, mode] of [
        ["forgot-password", "request"],
        ["reset-password", "reset"],
      ] as const) {
        const page = await Page({
          params: Promise.resolve({ locale: "sk", route: [route] }),
          searchParams: Promise.resolve({ token: "single-use-token" }),
        });
        expect(isValidElement(page)).toBe(true);
        expect(page.type).toBe(PasswordRecoveryPage);
        expect(page.props).toMatchObject({ mode, product });
        if (mode === "reset") expect(page.props).toHaveProperty("token", "single-use-token");
      }
    });
  }
});
