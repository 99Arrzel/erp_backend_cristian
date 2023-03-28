import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'cuentas';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      //código de la cuenta, #.#.#
      table.string('codigo', 255).notNullable();

      table.string('nombre', 255).notNullable();
      //nivel, del 1 al 7 nomás
      table.integer('nivel').notNullable();
      //Si es de último nivel o no
      table.enum('tipo', ['GLOBAL', 'DETALLE']).notNullable();
      //empresa a la que pertenece
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').onDelete('CASCADE');
      //padre
      table.integer('padre_id').unsigned().references('id').inTable('cuentas').onDelete('RESTRICT');
      //usuario
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
