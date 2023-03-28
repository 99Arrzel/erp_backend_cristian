import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'periodos';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.string('nombre', 255).notNullable();
      table.timestamp('fecha_inicio', { useTz: true }).notNullable();
      table.timestamp('fecha_fin', { useTz: true }).notNullable();
      table.boolean('estado').notNullable().defaultTo(true);
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE');
      table.integer('gestion_id').unsigned().references('id').inTable('gestions').onDelete('CASCADE');
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });

      table.unique(['nombre', 'gestion_id']);
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
