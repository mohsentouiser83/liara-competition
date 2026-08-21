# Liara Copilot

دستیار توسعه‌دهندگان لیارا با پاسخ‌های مبتنی بر مستندات، منبع قابل بررسی و قدم بعدی مشخص.

رابط فارسی پروژه از چهار وزن محلی فونت **IRANYekanX** استفاده می‌کند و برای بارگذاری فونت به سرویس خارجی وابسته نیست.

## اجرا

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

برای اتصال زنده، `AVALAI_API_KEY` و `AVALAI_MODEL` را در `.env.local` تنظیم کنید. کلید فقط در سرور خوانده می‌شود. بدون مدل پاسخ‌گو، برنامه پاسخ extractive و grounded را مستقیماً از evidence تولید می‌کند و چیزی خارج از مستندات نمی‌سازد.

## ساخت Knowledge Base

منبع ingestion، [مخزن رسمی مستندات لیارا](https://github.com/liara-cloud/docs) است:

```bash
pnpm docs:sync
pnpm rag:ingest
pnpm rag:evaluate
pnpm agent:evaluate
```

دستور اول آخرین نسخه branch اصلی مستندات را در `.cache/liara-docs` همگام می‌کند. دستور دوم MDXها را parse و normalize می‌کند، metadata می‌سازد، code blockها را کنار توضیح مربوط نگه می‌دارد و index محلی `.data/liara-index.json` را تولید می‌کند. این فایل‌ها generated هستند و وارد Git نمی‌شوند.

حالت محلی از hybrid retrieval شامل BM25، embedding قطعی محلی، metadata filtering و reranking استفاده می‌کند. اگر evidence قابل اتکایی پیدا نشود، خروجی خالی برمی‌گرداند.

## PostgreSQL و pgvector

در production، ابتدا PostgreSQL دارای افزونه pgvector را آماده کنید:

```bash
DATABASE_URL=postgresql://... pnpm db:migrate
DATABASE_URL=postgresql://... pnpm rag:ingest -- --prune
```

Schema شامل جدول‌های `knowledge_documents` و `knowledge_chunks`، جست‌وجوی full-text، metadata indexes و HNSW cosine index است. migration دوم نیز `conversations`، `messages` و `feedback` را می‌سازد. ابعاد embedding فعلی ۱۵۳۶ است و باید با مدل انتخابی یکسان باشد.

برای embedding واقعی AvalAI:

```dotenv
RAG_MODE=postgres
EMBEDDING_PROVIDER=avalai
EMBEDDING_DIMENSIONS=1536
AVALAI_EMBEDDING_MODEL=your-benchmarked-model
DATABASE_SSL_MODE=verify-full
REDIS_URL=redis://...
```

مدل embedding عمداً hard-code نشده است. حالت `deterministic` برای توسعه و تست reproducible است؛ قبل از production باید مدل AvalAI benchmark و index با همان مدل دوباره ساخته شود.

## بررسی کیفیت

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm rag:evaluate
pnpm agent:evaluate
```

Endpointهای اصلی:

- `POST /api/chat` — پاسخ NDJSON استریم‌شده
- `POST /api/feedback` — ثبت بازخورد
- `GET /api/health` — readiness دیتابیس، Knowledge Base و Redis بدون فراخوانی مدل
- `GET /health` — readiness مناسب Container و Liara؛ هنگام قطع dependency یا خالی‌بودن Knowledge Base کد ۵۰۳ می‌دهد

Retrieval در حالت `auto` با وجود `DATABASE_URL` از PostgreSQL/pgvector و در غیر این صورت از index محلی استفاده می‌کند. اگر هیچ indexی موجود نباشد، seed کوچک اولیه فقط برای بالا آمدن برنامه باقی می‌ماند.

## Agent و ایمنی

Agent سه intent اصلی `ASK`، `DEBUG` و `BUILD` را تشخیص می‌دهد و متناسب با آن یکی از ابزارهای `searchLiaraDocs`، `findRelatedDocs` یا `getDocumentation` را اجرا می‌کند. Context چهار پیام اخیر کاربر برای follow-upها استفاده می‌شود. در عیب‌یابی، اگر runtime، خطا یا لاگ ضروری مشخص نباشد فقط یک سؤال تکمیلی باارزش پرسیده می‌شود.

محدودیت اندازه و تعداد پیام، محدودیت retrieval، rate limit بر اساس IP و session، کنترل Origin، timeout ابزار و مدل، retry نمایی برای خطاهای transient، CSP و prompt-injection boundary فعال هستند. rate limit در production از Redis و در توسعه بدون `REDIS_URL` از حافظهٔ همان process استفاده می‌کند. در صورت تنظیم `DATABASE_URL`، مکالمه و feedback در PostgreSQL ذخیره می‌شوند؛ در حالت محلی، آخرین مکالمه فقط در مرورگر نگهداری می‌شود.

وقتی `APP_ENV=production` باشد، برنامه بدون مدل chat، مدل embedding، PostgreSQL، Redis، `RAG_MODE=postgres` و `EMBEDDING_PROVIDER=avalai` بالا نمی‌آید. اتصال دیتابیس به‌طور پیش‌فرض گواهی TLS را اعتبارسنجی می‌کند. فقط اگر ارائه‌دهنده زنجیرهٔ گواهی قابل اعتبارسنجی ندارد، `DATABASE_SSL_MODE=require` را آگاهانه انتخاب کنید؛ `disable` فقط برای شبکهٔ خصوصی مورد اعتماد یا توسعه است.

## Docker و استقرار لیارا

```bash
docker build -t liara-copilot .
docker run --rm -p 3000:3000 --env-file .env.local liara-copilot
```

Container با کاربر non-root اجرا می‌شود و `HEALTHCHECK` آن مسیر `/health` را بررسی می‌کند. Workflow گیت‌هاب ابتدا lint، typecheck، unit tests، ارزیابی‌ها، build و Docker build را اجرا می‌کند. سپس روی branch اصلی migrationها را اعمال می‌کند، آخرین مستندات را با embedding واقعی داخل PostgreSQL ingest می‌کند، برنامه را deploy می‌کند و تا سبزشدن readiness منتظر می‌ماند.

برای CD این مقادیر را در GitHub Environment با نام `production` تنظیم کنید:

- Secretها: `LIARA_API_TOKEN`، `PRODUCTION_DATABASE_URL` و `AVALAI_API_KEY`
- Variableها: `LIARA_APP_NAME`، `LIARA_APP_URL` و `AVALAI_EMBEDDING_MODEL`
- Variableهای اختیاری: `AVALAI_BASE_URL` و `DATABASE_SSL_MODE` (پیش‌فرض `verify-full`)

در تنظیمات runtime برنامهٔ لیارا نیز `DATABASE_URL`، `REDIS_URL`، مدل‌های AvalAI، `RAG_MODE=postgres`، `EMBEDDING_PROVIDER=avalai` و تنظیم TLS یکسان را وارد کنید. `APP_ENV=production` داخل image تنظیم شده است. خود سرویس‌های PostgreSQL/pgvector و Redis باید پیش از نخستین اجرای workflow provision شده باشند؛ workflow ساخت schema و Knowledge Base را انجام می‌دهد.
