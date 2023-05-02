import Schema from '@ioc:Adonis/Lucid/Schema';

class InsertDefaultMonedasSchema extends Schema {
  async up() {
    await this.db.table('monedas').insert([
      {
        nombre: 'Dólares',
        descripcion: 'Dólares americanos',
        abreviatura: 'USD',
        usuario_id: 1,
      },
      {
        nombre: 'Bolivianos',
        descripcion: 'Bolivianos de Bolivia',
        abreviatura: 'BOB',
        usuario_id: 1,
      },
      {
        nombre: 'Soles',
        descripcion: 'Soles de Perú',
        abreviatura: 'PEN',
        usuario_id: 1,
      },
      {
        nombre: 'Reales',
        descripcion: 'Reales de Brasil',
        abreviatura: 'R$',
        usuario_id: 1,
      },
      {
        nombre: 'Pesos Argentinos',
        descripcion: 'Moneda de Argentina',
        abreviatura: 'ARS',
        usuario_id: 1,
      }
    ]);
  }

  async down() { }
}

module.exports = InsertDefaultMonedasSchema;
