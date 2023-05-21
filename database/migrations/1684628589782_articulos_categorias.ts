import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'articulos_categorias';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('articulo_id').unsigned().references('id').inTable('articulos').notNullable().onDelete('CASCADE');
      table.integer('categoria_id').unsigned().references('id').inTable('categorias').notNullable().onDelete('CASCADE');
      table.primary(['articulo_id', 'categoria_id']);
    });
  }

  public async down() {
    this.schema.dropTable(this.tableName);
  }
}
