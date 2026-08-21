import { normalizeText, tokenize } from "./normalize";

export type QueryAnalysis = {
  normalized: string;
  terms: string[];
  service?: string;
  framework?: string;
  topic?: string;
  error?: string;
  inDomain: boolean;
};

const frameworks = ["nextjs", "nodejs", "react", "vue", "django", "laravel", "docker", "flask", "php", "python", "dotnet", "angular", "go"];

export function analyzeQuery(query: string): QueryAnalysis {
  const baseNormalized = normalizeText(query)
    .replace(/next\.js|next js|نکست جی اس/g, "nextjs")
    .replace(/node\.js|node js|نود جی اس/g, "nodejs");
  const error = baseNormalized.match(/\b(?:4\d\d|5\d\d|econnreset|timeout|enoent|cors)\b/i)?.[0];
  const normalized = [baseNormalized, ...(error === "502" ? ["لاگ", "گزارشات", "start", "port", "استقرار"] : [])].join(" ");
  const framework = frameworks.find((candidate) => normalized.includes(candidate));
  const service = /redis|postgres|mysql|mongodb|mariadb|mssql|rabbitmq|elastic/.test(normalized)
    ? "dbaas"
    : /(?:دامنه.*برنامه|برنامه.*دامنه|وصل.*دامنه)/.test(normalized)
      ? "paas"
      : /دامنه|dns/.test(normalized)
      ? "dns-management-system"
      : /ایمیل|mail/.test(normalized)
        ? "email-server"
        : /ذخیره سازی|object storage|باکت/.test(normalized)
          ? "object-storage"
          : framework || /استقرار|deploy|برنامه|اپلیکیشن/.test(normalized)
            ? "paas"
            : undefined;
  const topic = /دامنه|dns/.test(normalized)
    ? "domains"
    : /لاگ|log|502|500|خطا|error|timeout/.test(normalized)
    ? "troubleshooting"
    : /استقرار|deploy|build/.test(normalized)
      ? "deployment"
      : /وصل|اتصال|connect/.test(normalized)
        ? "connection"
        : /شبکه|network/.test(normalized)
        ? "networking"
        : /ساخت|بساز|ایجاد|راه اندازی|نصب/.test(normalized)
          ? "getting-started"
          : undefined;
  const inDomain = Boolean(
    service || framework || topic || error ||
    /لیارا|ssl|دامنه|دیتابیس|database|سرور|vps|باکت|bucket|فضای ابری|cdn|cli|api|پلن|قیمت|هزینه|رم|cpu|git|github|docker/.test(normalized)
  );
  return { normalized, terms: tokenize(normalized), service, framework, topic, error, inDomain };
}
