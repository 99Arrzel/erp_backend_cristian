import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'empresa_monedas';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.float("cambio").nullable();
      table.boolean("activo").notNullable().defaultTo(true);
      table.integer('moneda_alternativa_id').unsigned().references('id').inTable('monedas').nullable().onDelete('CASCADE');
      table.integer('moneda_principal_id').unsigned().references('id').inTable('monedas').notNullable().onDelete('CASCADE');
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').notNullable().onDelete('CASCADE');
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').notNullable().onDelete('CASCADE');
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
