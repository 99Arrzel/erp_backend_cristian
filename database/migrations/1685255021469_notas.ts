import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'notas';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');

      table.integer('nro_nota').notNullable();
      table.date('fecha').notNullable();
      table.string('descripcion', 255).notNullable();
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').onDelete('CASCADE');
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE');
      //comprobante_id
      table.integer('comprobante_id').unsigned().references('id').inTable('comprobantes').nullable().onDelete('CASCADE');
      //Enum de tipo compra o venta
      table.enum('tipo', ['compra', 'venta']).notNullable();
      //Estado activo y anulado
      table.enum('estado', ['activo', 'anulado']).notNullable();
      //Total
      table.decimal('total', 14, 2).notNullable();

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
