import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import EmpresaMoneda from 'App/Models/EmpresaMoneda';
import { schema } from '@ioc:Adonis/Core/Validator';
export default class EmpresaMonedasController {
  public async listAllByEmpresa({ request, response, auth }: HttpContextContract) {
    if (request.input('id') == null) {
      return response.status(400).json({ message: 'El id de la empresa es requerido' });
    }
    let empMon = await EmpresaMoneda.query().where('empresa_id', request.input('id')).where('usuario_id', auth.user?.id as number).preload('moneda_alternativa').preload('moneda_principal');
    return response.json(empMon);
  }
  public async register({ request, response, auth }: HttpContextContract) {
    const data = schema.create({
      moneda_alternativa_id: schema.number(),
      moneda_principal_id: schema.number(),
      empresa_id: schema.number(),
      cambio: schema.number(),
    });
    await request.validate({
      schema: data, messages: {
        'moneda_alternativa_id.required': 'La moneda alternativa es requerida',
        'moneda_alternativa_id.number': 'La moneda alternativa debe ser un número',
        'moneda_principal_id.required': 'La moneda principal es requerida',
        'moneda_principal_id.number': 'La moneda principal debe ser un número',
        'empresa_id.required': 'La empresa es requerida',
        'empresa_id.number': 'La empresa debe ser un número',
        'cambio.required': 'El cambio es requerido',
        'cambio.number': 'El cambio debe ser un número',
      }
    });
    /* Validamos que el último valor no sea del mismo alternativa con el mismo cambio y el estado sea el mismo*/
    const last = await EmpresaMoneda.query().where('empresa_id', request.input('empresa_id')).where('moneda_alternativa_id', request.input('moneda_alternativa_id')).where('cambio', request.input('cambio')).where('activo', true).first();
    if (last) {
      return response.status(400).json({ message: 'Ya existe un registro con el mismo cambio y moneda alternativa' });
    }
    /* Seteamos todos los registros de EmpresaMoneda para esta empresa en false */
    await EmpresaMoneda.query().where('empresa_id', request.input('empresa_id')).update({ activo: false });
    /* Registramos */
    const registro = await EmpresaMoneda.create({
      moneda_alternativa_id: request.input('moneda_alternativa_id'),
      moneda_principal_id: request.input('moneda_principal_id'),
      empresa_id: request.input('empresa_id'),
      cambio: request.input('cambio'),
      usuario_id: auth.user?.id as number,
    });
    return response.json(registro);

  }
}
