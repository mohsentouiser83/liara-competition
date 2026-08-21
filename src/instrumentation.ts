export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Importing the validated environment makes a bad production configuration
    // fail during server startup instead of silently enabling the demo provider.
    try {
      await import("@/lib/config/env");
    } catch (error) {
      process.stderr.write(`Invalid server configuration: ${error instanceof Error ? error.message : "unknown error"}\n`);
      process.exit(1);
    }
  }
}
