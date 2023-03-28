import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'empresas';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.string('nombre', 255).notNullable();
      table.string('nit', 255).notNullable();
      table.string('sigla', 100).notNullable();
      table.string('telefono', 255).notNullable();
      table.string('correo', 255).notNullable();
      table.string('direccion', 255).notNullable();
      table.integer('niveles').notNullable();
      table.boolean('estado').notNullable().defaultTo(true);
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE');
      
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
