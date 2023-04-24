import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Usuario from 'App/Models/Usuario';
import { schema } from '@ioc:Adonis/Core/Validator';
import Database from '@ioc:Adonis/Lucid/Database';
export default class UsuariosController {
  public async login({ request, auth }: HttpContextContract) {
    const loginSchema = schema.create({
      usuario: schema.string(),
      password: schema.string(),
    });
    await request.validate({ schema: loginSchema });
    const { usuario, password } = request.all();
    const token = await auth.use('api').attempt(usuario, password, {
      expiresIn: '1 year',
    });
    console.log("Token:", token.toJSON());
    return token.toJSON();
  }
  public async id_usuario({ response, auth }: HttpContextContract) {
    let user = {
      id: auth.user?.id,
    };
    console.log(user);
    /* Return user to json */
    return response.json(user);
  }
  public async register({ request }: HttpContextContract) {
    const registerSchema = schema.create({
      nombre: schema.string(),
      usuario: schema.string(),
      password: schema.string(),
    });
    await request.validate({ schema: registerSchema });
    const { nombre, usuario, password } = request.all();
    //Validate data
    const userExists = await Usuario.findBy('usuario', usuario);
    if (userExists) {
      return 'Usuario ya existe';
    }

    let user = await Usuario.create({ usuario, password, nombre, tipo: 'usuario' });
    return user;
  }
  public async logout({ auth }: HttpContextContract) {
    await auth.use('api').revoke();
    return 'Logout';
  }
  public async profile({ auth }: HttpContextContract) {
    return auth.user;
  }
  public async no_auth() {
    //return await Database.query().from('usuarios').select('*').where('id', 2);
    return await Database.rawQuery('SELECT * FROM usuarios WHERE id = ?', [2]);
  }
}
