import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'lotes';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {

      //nro_lote
      table.integer('nro_lote').notNullable();
      table.integer('articulo_id').unsigned().references('id').inTable('articulos').onDelete('CASCADE');

      table.enum('estado', ['activo', 'anulado']).notNullable();

      //fecha_vencimiento
      table.date('fecha_vencimiento').nullable();
      //fecha Ingreso
      table.date('fecha_ingreso').notNullable();
      table.integer('cantidad').notNullable();
      table.decimal('precio_compra', 14, 2).notNullable();
      table.integer('stock').notNullable();
      table.integer('nota_id').unsigned().references('id').inTable('notas').onDelete('CASCADE');
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
      //unique nro_lote y articulo_id, además de pk
      table.primary(['nro_lote', 'articulo_id']);


    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
