import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'monedas';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.string("nombre").notNullable();
      table.string("descripcion").notNullable();
      table.string("abreviatura").notNullable();
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE');
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
    });
    //await Moneda.create({ nombre: "Dolar", descripcion: "Dolar Americano", abreviatura: "USD" });
    //await Moneda.create({ nombre: "Boliviano", descripcion: "Boliviano de Bolivia", abreviatura: "BOB" });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
