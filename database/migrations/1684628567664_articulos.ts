import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'articulos';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.string('nombre');
      table.string('descripcion');
      table.decimal('precio_venta', 10, 2);
      table.integer('stock').defaultTo(0);
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').notNullable().onDelete('RESTRICT');
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').notNullable().onDelete('RESTRICT');

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
