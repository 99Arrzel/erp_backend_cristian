import Schema from "@ioc:Adonis/Lucid/Schema";

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
    ]);
  }

  async down() {

  }
}

module.exports = InsertDefaultMonedasSchema;
