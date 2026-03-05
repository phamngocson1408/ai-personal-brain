import { runMigrations, closePool } from '../connection';

async function main() {
  console.log('Running migrations...');
  await runMigrations();
  await closePool();
  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
