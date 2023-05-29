import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'detalles';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.integer('cantidad').notNullable();
      table.decimal('precio_venta', 14, 2).notNullable();
      table.integer('nota_id').unsigned().references('id').inTable('notas').notNullable().onDelete('CASCADE');
      table.integer('lote_id').unsigned().references('id').inTable('lotes').notNullable().onDelete('CASCADE');


      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
    });
  }
  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
