import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'categorias';

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.string("nombre");
      table.string("descripcion");
      /* Relacion empresa, usuario y categoria padre */
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').notNullable().onDelete('RESTRICT');
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').notNullable().onDelete('RESTRICT');
      table.integer('categoria_id').unsigned().references('id').inTable('categorias').nullable().onDelete('RESTRICT');      /**
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
