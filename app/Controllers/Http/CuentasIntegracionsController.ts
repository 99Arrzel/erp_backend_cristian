import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
export default class CuentasIntegracionsController {
  public async listar({ request, response, auth }: HttpContextContract) {
    const id = request.input('id');
    if (id == null) {
      return response.status(400).json({ message: 'El id de la empresa es requerido' });
    }
    const empresa = await auth.user?.related('empresas').query().where('id', id).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const integracion = await empresa.related('cuentas_integracion').query()
      .preload('caja')
      .preload('credito_fiscal')
      .preload('debito_fiscal')
      .preload('compras')
      .preload('ventas')
      .preload('it')
      .preload('it_por_pagar')


      .first();
    return response.status(200).json(integracion ?? {});
  }
  public async setIntegracion({ request, response, auth }: HttpContextContract) {
    const data = request.only(['estado',
      'empresa_id',
      'caja_id',
      'credito_fiscal_id',
      'debito_fiscal_id',
      'compras_id',
      'ventas_id',
      'it_id',
      'it_por_pagar_id']);
    /* Validar ids not null*/
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const element = data[key];
        if (element == null) {
          return response.status(400).json({ message: 'El id de la ' + key + ' es requerido' });
        }
      }
    }
    //Validar que existan
    Promise.all([auth.user?.related('empresas').query().where('id', data.empresa_id).firstOrFail(),
    auth.user?.related('cuentas').query().where('id', data.caja_id).firstOrFail(),
    auth.user?.related('cuentas').query().where('id', data.credito_fiscal_id).firstOrFail(),
    auth.user?.related('cuentas').query().where('id', data.debito_fiscal_id).firstOrFail(),
    auth.user?.related('cuentas').query().where('id', data.compras_id).firstOrFail(),
    auth.user?.related('cuentas').query().where('id', data.ventas_id).firstOrFail(),
    auth.user?.related('cuentas').query().where('id', data.it_id).firstOrFail(),
    auth.user?.related('cuentas').query().where('id', data.it_por_pagar_id).firstOrFail()
    ]).catch((err) => {
      return response.status(400).json({ message: 'Una de las cuentas no existe ' + err.message });
    });
    //Verificar que sean unicos ids
    const ids = [data.caja_id, data.credito_fiscal_id, data.debito_fiscal_id, data.compras_id, data.ventas_id, data.it_id, data.it_por_pagar_id];
    const unique_ids = [... new Set(ids)];
    if (unique_ids.length != ids.length) {
      return response.status(400).json({ message: 'Las cuentas deben ser únicas' });
    }
    const empresa = await auth.user?.related('empresas').query().where('id', data.empresa_id).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    let integracion = await empresa.related('cuentas_integracion').query().first();
    if (!integracion) {
      integracion = await empresa.related('cuentas_integracion').create(data);
    }
    integracion.estado = data.estado;
    integracion.caja_id = data.caja_id;
    integracion.credito_fiscal_id = data.credito_fiscal_id;
    integracion.debito_fiscal_id = data.debito_fiscal_id;
    integracion.compras_id = data.compras_id;
    integracion.ventas_id = data.ventas_id;
    integracion.it_id = data.it_id;
    integracion.it_por_pagar_id = data.it_por_pagar_id;
    integracion.save();
    return response.status(200).json(integracion);
  }
}
