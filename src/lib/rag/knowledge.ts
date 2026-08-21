import type { Source } from "@/types/chat";

export type KnowledgeDocument = Source & {
  content: string;
  keywords: string[];
};

export const knowledge: KnowledgeDocument[] = [
  {
    id: "redis-quick-setup",
    title: "راه‌اندازی سریع دیتابیس Redis",
    url: "https://docs.liara.ir/dbaas/redis/quick-setup/",
    section: "ایجاد دیتابیس و تنظیم شبکه",
    keywords: ["redis", "ردیس", "دیتابیس", "database", "ساخت", "شبکه خصوصی"],
    content: "در کنسول لیارا حساب شخصی یا تیم را انتخاب کنید، وارد منوی دیتابیس شوید، راه‌اندازی دیتابیس و سپس Redis را انتخاب کنید. نسخه، شناسه یکتا، شبکه خصوصی و منابع را تعیین کنید. برای برنامه‌های داخل لیارا، اتصال از شبکه خصوصی امن‌تر است؛ دسترسی عمومی فقط برای اتصال خارج از لیارا لازم است."
  },
  {
    id: "next-deploy",
    title: "استقرار برنامه NextJS در لیارا",
    url: "https://docs.liara.ir/paas/nextjs/how-tos/deploy-app/",
    section: "نصب وابستگی‌ها، build و start",
    keywords: ["next", "nextjs", "نکست", "استقرار", "deploy", "build", "start", "package.json", "۵۰۲", "502"],
    content: "برنامه NextJS باید package.json داشته باشد. لیارا وابستگی‌ها را نصب می‌کند، در صورت وجود اسکریپت build آن را اجرا می‌کند و برنامه را با اسکریپت start بالا می‌آورد. پس از استقرار، تاریخچه، رویدادها و گزارشات برنامه برای بررسی در دسترس هستند."
  },
  {
    id: "next-logs",
    title: "تنظیم لاگ‌ها در NextJS",
    url: "https://docs.liara.ir/paas/nextjs/how-tos/set-logs/",
    section: "گزارشات نرم‌افزاری",
    keywords: ["next", "nextjs", "لاگ", "log", "console", "خطا", "error", "۵۰۲", "502"],
    content: "لاگ‌های console.log و console.error برنامه NextJS در گزارشات نرم‌افزاری لیارا قابل مشاهده‌اند. برای تشخیص خطای اجرا باید گزارشات نرم‌افزاری و رویدادهای استقرار بررسی شوند."
  }
];
