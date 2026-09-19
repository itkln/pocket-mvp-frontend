export const spotCategories = [
  { slug: "restaurants", label: "Рестораны", filters: ["Итальянская", "Азиатская", "Завтраки", "Кофе и десерты", "Лучшие", "Открыто", "С предзаказом"] },
  { slug: "entertainment", label: "Развлечения", filters: ["Кино", "Квесты", "Для двоих", "Для компании"] },
  { slug: "activities", label: "Активности", filters: ["Экскурсии", "На воде", "На улице"] },
  { slug: "sports", label: "Спорт", filters: ["Тренажёрный зал", "Групповые занятия", "Лучшие", "Рядом"] },
  { slug: "yoga-pilates", label: "Йога и пилатес", filters: ["Йога", "Пилатес", "Для начинающих", "Рядом"] },
  { slug: "spa-massage", label: "SPA и массаж", filters: ["Расслабляющий", "Спортивный", "Лучшие", "Рядом"] },
  { slug: "beauty", label: "Красота", filters: ["Стрижка", "Борода", "Аппаратный", "Педикюр", "Волосы", "Макияж"] },
  { slug: "masterclasses", label: "Мастер-классы", filters: ["Керамика", "Живопись", "Для начинающих"] },
];

export const categoryForRoute = (route?: string) => spotCategories.find((category) => category.slug === route);

// Match query words independently; Russian adjective endings should not prevent cuisine searches.
export function matchesSpotQuery(text: string, query: string) {
  const normalize = (value: string) => value.toLocaleLowerCase().replaceAll("ё", "е").normalize("NFD").replace(/([a-z])[\u0300-\u036f]+/g, "$1").normalize("NFC");
  const words = normalize(text).match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms = normalize(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  const stem = (word: string) => word.replace(/(?:ский|ская|ское|ские|ской|ов|ы|а)$/u, "");
  return terms.every((term) => words.some((word) => word.includes(term) || (/[а-я]/u.test(term) && stem(word).startsWith(stem(term)))));
}
