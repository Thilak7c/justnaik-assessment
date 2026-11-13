/**
 * Runs all pending database migrations.
 *   npm run migrate            -> apply migrations
 *   npm run migrate -- down    -> roll back the last batch
 */
import { db } from './knex';

async function main() {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  if (direction === 'down') {
    const [batch, files] = await db.migrate.rollback();
    console.log(`Rolled back batch ${batch}:`, files);
  } else {
    const [batch, files] = await db.migrate.latest();
    console.log(files.length ? `Applied batch ${batch}: ${files.join(', ')}` : 'Database already up to date');
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
