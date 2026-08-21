import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const repository = "https://github.com/liara-cloud/docs.git";
const destination = path.resolve(process.cwd(), ".cache", "liara-docs");

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function exists(target: string) {
  return access(target).then(() => true, () => false);
}

async function main() {
  await mkdir(path.dirname(destination), { recursive: true });
  if (await exists(path.join(destination, ".git"))) {
    await run("git", ["-C", destination, "fetch", "--depth", "1", "origin", "master"]);
    await run("git", ["-C", destination, "reset", "--hard", "origin/master"]);
  } else {
    await run("git", ["clone", "--depth", "1", "--branch", "master", repository, destination]);
  }

  await run("git", ["-C", destination, "rev-parse", "--short", "HEAD"]);
  console.log(`Liara docs synced to ${destination}`);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
