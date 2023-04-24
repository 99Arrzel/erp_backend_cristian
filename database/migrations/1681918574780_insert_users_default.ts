import Schema from '@ioc:Adonis/Lucid/Schema';

class InsertDefaultUsersSchema extends Schema {
  async up() {
    await this.db.table('usuarios').insert([
      {
        id: 1,
        nombre: 'cristian',
        usuario: 'cristian',
        password:
          '$scrypt$n=16384,r=8,p=1$lwfs3oeh3hskDluQNAdT3A$481ijTkajWxG2NEGVG6M3Ns9K9d6AT5YMQhHmqd3GfT/E03sw/XSMpAg2TqbqCwvA0Z1KrZIFUqJD6ilzxzbIA',
        tipo: 'admin',


      },
      // insert more data here
    ]);
  }

  async down() { }
}

module.exports = InsertDefaultUsersSchema;
