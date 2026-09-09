import { resolve } from "node:path";
import { z } from "zod";

// Only values live outside this registry. No client receives these settings.
export const environment = {
  WORKSHOP_DATA_DIR: {
    requirement: "optional",
    scope: "server",
    schema: z.string().trim().min(1).refine(value => !value.includes("\0")),
    fallback: "./data",
    note: "없으면 프로젝트의 data 폴더에 DB와 세션 키를 저장한다.",
  },
} as const;
export const runtimeEnvironmentKeys = ["NODE_ENV", "NEXT_RUNTIME"] as const;

export function readConfig(values: Record<string, string | undefined> = process.env) {
  const problems: string[] = [];
  const parsed: Record<string, string> = {};
  for (const [key, entry] of Object.entries(environment)) {
    const result = entry.schema.safeParse(values[key] ?? entry.fallback);
    if (!result.success) problems.push(`${key}: 비어 있지 않은 디렉터리 경로가 필요합니다.`);
    else parsed[key] = result.data;
  }
  if (problems.length) throw new Error(problems.join("\n"));
  return { dataDir: resolve(/* turbopackIgnore: true */ parsed.WORKSHOP_DATA_DIR) };
}
