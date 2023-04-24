import BaseSchema from '@ioc:Adonis/Lucid/Schema';

export default class extends BaseSchema {
  protected tableName = 'detalle_comprobantes';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id');
      table.string('numero').notNullable(); //Aumenta en relación al comprobante, empieza en 1
      table.string('glosa', 255).notNullable(); //Copia de la glosa del comprobante, que es modificable antes de grabar
      table.float('monto_debe').nullable();// debe o haber tienen que ser mayor a 0, pero solo si haber es null
      table.float('monto_haber').nullable(); // debe o haber tienen que ser mayor a 0, pero solo si debe es null
      table.float('monto_debe_alt').nullable(); // debe o haber tienen que ser mayor a 0, pero solo si haber es null
      table.float('monto_haber_alt').nullable(); // debe o haber tienen que ser mayor a 0, pero solo si debe es null
      /* Usuario, comprobante y cuenta */
      table.integer('usuario_id').unsigned().references('id').inTable('usuarios').notNullable().onDelete('CASCADE');
      table.integer('comprobante_id').unsigned().references('id').inTable('comprobantes').notNullable().onDelete('CASCADE'); //Minimo 2 detalles * comprobante
      table.integer('cuenta_id').unsigned().references('id').inTable('cuentas').notNullable().onDelete('CASCADE'); //Solo las cuentas de último nivel (detalle)

      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
