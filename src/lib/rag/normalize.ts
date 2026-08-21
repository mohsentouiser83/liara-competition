const arabicToPersian = new Map([
  ["ي", "ی"],
  ["ى", "ی"],
  ["ك", "ک"],
  ["ة", "ه"],
  ["ۀ", "ه"]
]);

export const persianStopWords = new Set([
  "از", "به", "در", "را", "با", "برای", "که", "این", "آن", "یک", "و", "یا", "تا", "روی",
  "است", "هست", "شود", "شده", "کن", "کردن", "چطور", "چیست", "بررسی", "من", "ما", "شما"
]);

export function normalizeText(text: string) {
  return Array.from(text.normalize("NFKC"))
    .map((character) => arabicToPersian.get(character) ?? character)
    .join("")
    .toLocaleLowerCase("fa")
    .replace(/[\u200c\u200e\u200f\u2066-\u2069]/g, " ")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[^\p{L}\p{N}._+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string) {
  return normalizeText(text)
    .split(" ")
    .filter((term) => term.length > 1 && !persianStopWords.has(term));
}
