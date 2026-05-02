/**
 * Prisma Seed：内置管理员 + LLM Profile（与启动时 ensure 一致，便于 CI / 手工 `npx prisma db seed`）
 */
import 'dotenv/config';
import { ensureBuiltInAdmin } from '../src/services/builtInAdminSeed';
import { ensureLlmProviderProfiles } from '../src/services/llmProfileSeed';

async function main(): Promise<void> {
  await ensureBuiltInAdmin();
  await ensureLlmProviderProfiles();
}

main()
  .then(() => {
    console.log('Seed completed.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
