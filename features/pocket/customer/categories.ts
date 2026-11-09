export const spotCategories = [
  {
    slug: "restaurants",
    label: "Рестораны",
    filters: [
      "Итальянская",
      "Азиатская",
      "Завтраки",
      "Кофе и десерты",
      "Лучшие",
      "Открыто",
      "С предзаказом",
    ],
  },
];

export const categoryForRoute = (route?: string) =>
  spotCategories.find((category) => category.slug === route);

// Match query words independently; Russian adjective endings should not prevent cuisine searches.
export function matchesSpotQuery(text: string, query: string) {
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase()
      .replaceAll("ё", "е")
      .normalize("NFD")
      .replace(/([a-z])[\u0300-\u036f]+/g, "$1")
      .normalize("NFC");
  const words = normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms = normalize(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  const stem = (word: string) => word.replace(/(?:ский|ская|ское|ские|ской|ов|ы|а)$/u, "");
  return terms.every((term) =>
    words.some(
      (word) => word.includes(term) || (/[а-я]/u.test(term) && stem(word).startsWith(stem(term))),
    ),
  );
}
