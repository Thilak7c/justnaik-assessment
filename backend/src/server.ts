import { createApp } from './app';
import { config } from './config';
import { db } from './db/knex';

const app = createApp();
const server = app.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
});

// Close HTTP server and DB pool cleanly (e.g. `docker stop`)
const shutdown = () => {
  server.close(() => {
    db.destroy().finally(() => process.exit(0));
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
