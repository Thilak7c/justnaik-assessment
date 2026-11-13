import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    // Emails are normalised to lower case before saving, so a plain unique constraint is enough.
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
