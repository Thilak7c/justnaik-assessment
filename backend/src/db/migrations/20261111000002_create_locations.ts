import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('locations', (t) => {
    t.increments('id').primary();
    t.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name', 100).notNullable();
    // NUMERIC (exact decimal) instead of FLOAT: the sample file has 9 decimal places and
    // floating point rounding would break duplicate detection.
    t.decimal('latitude', 12, 9).notNullable();
    t.decimal('longitude', 12, 9).notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'created_at']);
  });

  await knex.raw(`
    ALTER TABLE locations
      ADD CONSTRAINT locations_latitude_range CHECK (latitude BETWEEN -90 AND 90),
      ADD CONSTRAINT locations_longitude_range CHECK (longitude BETWEEN -180 AND 180)
  `);

  // One user cannot have the same place (same name, ignoring case, at the same coordinates) twice.
  // This is what makes uploading the same file twice safe (INSERT ... ON CONFLICT DO NOTHING).
  await knex.raw(`
    CREATE UNIQUE INDEX locations_user_name_coords_unique
      ON locations (user_id, lower(name), latitude, longitude)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('locations');
}
