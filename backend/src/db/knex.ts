import knexFactory, { Knex } from 'knex';
import path from 'path';
import { config } from '../config';

export const knexConfig: Knex.Config = {
  client: 'pg',
  connection: config.databaseUrl,
  pool: { min: 0, max: 10 },
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    // .ts when running through tsx (dev/test), .js after `npm run build`
    loadExtensions: ['.ts', '.js'],
    tableName: 'knex_migrations',
  },
};

export const db = knexFactory(knexConfig);
