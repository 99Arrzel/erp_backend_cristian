import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'comprobantes';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.string('serie', 255).notNullable(); //Aumenta en relación a la empresa, empieza en 1
      table.string('glosa', 255).notNullable();
      table.timestamp('fecha').notNullable(); //Modificable, debe pertenecer a un PERIODO abierto
      table.float('tc').notNullable(); //Tipo de cambio, se saca de las monedas, pero es modificable en los decimales
      table.enum('estado', ['Abierto', 'Cerrado', 'Anulado']).notNullable().defaultTo('Abierto'); //Cuando se crea es abierto, se puede anular o cerrar, si se anula o cierra no se puede modificar
      table.enum('tipo', ['Ingreso', 'Egreso', 'Traspaso', 'Apertura', 'Ajuste']).notNullable(); // Solo uno de apertura por GESTION, no por periodo
      table.integer('empresa_id').unsigned().references('id').inTable('empresas').notNullable().onDelete('CASCADE');
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').notNullable().onDelete('CASCADE');
      table.integer('moneda_id').unsigned().references('id').inTable('monedas').notNullable().onDelete('CASCADE');
      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });

      table.unique(['empresa_id', 'serie']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
