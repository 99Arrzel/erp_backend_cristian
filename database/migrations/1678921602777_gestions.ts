import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'gestions';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.string('nombre', 255).notNullable();
      table.timestamp('fecha_inicio', { useTz: true }).notNullable();
      table.timestamp('fecha_fin', { useTz: true }).notNullable();
      table.boolean('estado').notNullable().defaultTo(true);
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE');
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').onDelete('CASCADE');

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
      table.unique(['nombre', 'empresa_id']); //Unique name per company
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
