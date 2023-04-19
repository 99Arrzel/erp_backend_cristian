
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Moneda from 'App/Models/Moneda';
export default class MonedaController {

  public async listAll({ response, auth }: HttpContextContract) {

    return response.json(await Moneda.query().where('usuario_id', auth.user?.id as number));
  }
}
