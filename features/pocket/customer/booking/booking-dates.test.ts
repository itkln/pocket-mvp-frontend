import { describe, expect, it } from "vitest";
import { translate } from "../../i18n";
import { guestsLabel } from "./booking-dates";

describe("guestsLabel", () => {
  it.each([
    ["ru", 1, "1 гость"],
    ["ru", 3, "3 гостя"],
    ["ru", 5, "5 гостей"],
    ["en", 1, "1 guest"],
    ["en", 2, "2 guests"],
    ["ua", 4, "4 гості"],
    ["ua", 12, "12 гостей"],
    ["sk", 1, "1 hosť"],
    ["sk", 3, "3 hostia"],
    ["sk", 20, "20 hostí"],
  ] as const)("%s, %i guests", (locale, count, expected) => {
    expect(guestsLabel((source, params) => translate(source, locale, params), count, locale)).toBe(
      expected,
    );
  });
});
