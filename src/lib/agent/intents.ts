import type { Intent } from "@/types/chat";

const debugTerms = /خطا|error|ارور|۵۰۲|502|اجرا نمی|کار نمی|لاگ|log|مشکل|قطع|timeout/i;
const buildTerms = /می.?خوام|میخواهم|بساز|ایجاد|استقرار|deploy|راه.?اندازی|نصب/i;

export function detectIntent(query: string): Intent {
  if (debugTerms.test(query)) return "debug";
  if (buildTerms.test(query)) return "build";
  return "ask";
}
