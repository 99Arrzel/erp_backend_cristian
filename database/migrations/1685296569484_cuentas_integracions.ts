import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'cuentas_integracions';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.boolean('estado').notNullable().defaultTo(true);
      //Cuentas
      table.integer('caja_id').unsigned().references('id').inTable('cuentas').notNullable().onDelete('CASCADE');
      table.integer('credito_fiscal_id').unsigned().references('id').inTable('cuentas').notNullable().onDelete('CASCADE');
      table.integer('debito_fiscal_id').unsigned().references('id').inTable('cuentas').notNullable().onDelete('CASCADE');
      table.integer('compras_id').unsigned().references('id').inTable('cuentas').notNullable().onDelete('CASCADE');
      table.integer('ventas_id').unsigned().references('id').inTable('cuentas').notNullable().onDelete('CASCADE');
      table.integer('it_id').unsigned().references('id').inTable('cuentas').notNullable().onDelete('CASCADE');
      table.integer('it_por_pagar_id').unsigned().references('id').inTable('cuentas').notNullable().onDelete('CASCADE');
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').notNullable().onDelete('CASCADE');
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
      //Cada cuenta debe ser única para cada empresa
      table.unique(['caja_id', 'empresa_id']);
      table.unique(['credito_fiscal_id', 'empresa_id']);
      table.unique(['debito_fiscal_id', 'empresa_id']);
      table.unique(['compras_id', 'empresa_id']);
      table.unique(['ventas_id', 'empresa_id']);
      table.unique(['it_id', 'empresa_id']);
      table.unique(['it_por_pagar_id', 'empresa_id']);
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
