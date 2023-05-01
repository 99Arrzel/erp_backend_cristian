import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Comprobante, { TipoComprobante } from 'App/Models/Comprobante';
import { schema } from '@ioc:Adonis/Core/Validator';
import Periodo from 'App/Models/Periodo';
import Gestion from 'App/Models/Gestion';
import Cuenta from 'App/Models/Cuenta';
import ComprobanteDetalle from 'App/Models/ComprobanteDetalle';
import Database from '@ioc:Adonis/Lucid/Database';




/* debe: cuenta.comprobante_detalles.reduce((prev, current) => (current.monto_debe ?? 0) + prev, 0),
  debe_alt: cuenta.comprobante_detalles.reduce((prev, current) => (current.monto_debe_alt ?? 0) + prev, 0),
    haber: cuenta.comprobante_detalles.reduce((prev, current) => (current.monto_haber ?? 0) + prev, 0),
      haber_alt: cuenta.comprobante_detalles.reduce((prev, current) => (current.monto_haber_alt ?? 0) + prev, 0) */
export function SumDetallesIndividual({ cuenta }: { cuenta: Cuenta; }) {
  return {
    ...cuenta,
    debe: cuenta.comprobante_detalles.reduce((prev, current) => (current.monto_debe ?? 0) + prev, 0),
    debe_alt: cuenta.comprobante_detalles.reduce((prev, current) => (current.monto_debe_alt ?? 0) + prev, 0),
    haber: cuenta.comprobante_detalles.reduce((prev, current) => (current.monto_haber ?? 0) + prev, 0),
    haber_alt: cuenta.comprobante_detalles.reduce((prev, current) => (current.monto_haber_alt ?? 0) + prev, 0)
  };
}



export default class ComprobantesController {

  public async unComprobante({ request, response, auth }: HttpContextContract) {
    console.log(request.input('id'));
    const id = request.input('id');
    if (!id) {
      return response.badRequest({ error: 'No se ha enviado el id del comprobante' });
    }
    let comprobante = await Comprobante.query().where('id', id).where('usuario_id', auth.user?.id as number).preload('comprobante_detalles', (query) => {
      query.preload('cuenta');
    }).preload('empresa')
      .preload('moneda')
      .preload('usuario').first();
    if (!comprobante) {
      return response.badRequest({ error: 'No se ha encontrado el comprobante' });
    }
    return response.json(comprobante);
  }

  public async ComprobanteAperturaGestion({ request, response, auth }: HttpContextContract) {
    const id_gestion = request.input('id_gestion');
    const id_moneda = request.input('id_moneda');
    if (!id_gestion) {
      return response.badRequest({ error: 'No se ha enviado el id de la gestión' });
    }
    const gestion = await Gestion.findOrFail(id_gestion);
    const fecha_inicio = new Date(gestion.fecha_inicio.toString());
    const fecha_fin = new Date(gestion.fecha_fin.toString());
    const comprobanteApertura = await Comprobante.query().where('tipo', 'Apertura').where('usuario_id', auth.user?.id as number).where('empresa_id', gestion.empresa_id)
      .whereBetween('fecha', [fecha_inicio, fecha_fin])
      .first();
    if (!comprobanteApertura) {
      return response.badRequest({ error: 'No se ha encontrado el comprobante de apertura' });
    }
    const ids_cuentas = (await ComprobanteDetalle.query().where('comprobante_id', comprobanteApertura.id).select('cuenta_id').distinct()).map((v) => v.cuenta_id);;
    /* Recursive ids of cuentas (parents)*/
    const ids_cuentas2 = (await Database.query()
      .withRecursive('padre', (query) => {
        // The base case: Select the rows with the child IDs
        query
          .select('id', 'padre_id')
          .from('cuentas')
          .whereIn('id', ids_cuentas)
          .union((qb) => {
            // The recursive step: Select rows with parent IDs from the previous step
            qb
              .select('cuentas.id', 'cuentas.padre_id')
              .from('cuentas')
              .join('padre', 'cuentas.id', 'padre.padre_id');
          });
      })
      .select('id')
      .from('padre')).map((v) => v.id);
    const ids_detalles = (await ComprobanteDetalle.query().where('comprobante_id', comprobanteApertura.id).select('id').distinct()).map((v) => v.id);
    const cuentas = await Cuenta.query()
      .select('id', 'codigo', 'nombre', 'padre_id', 'nivel', 'tipo')
      .where('empresa_id', gestion.empresa_id)
      .whereIn('id', ids_cuentas2)
      .orderByRaw("inet_truchon(codigo)")
      //.groupBy('codigo')
      .preload('comprobante_detalles', (query) => {
        query.whereIn('id', ids_detalles)
          .select('monto_debe', 'monto_haber', 'monto_debe_alt', 'monto_haber_alt', 'id', 'glosa');
      });
    if (comprobanteApertura.moneda_id == id_moneda) {
      cuentas.forEach((cuenta) => {
        cuenta.comprobante_detalles.forEach((detalle) => {
          detalle.monto_debe = detalle.monto_debe_alt;
          detalle.monto_haber = detalle.monto_haber_alt;
        });
      });
    }


    const activos = cuentas.filter((cuenta) => cuenta.codigo.startsWith('1')).map((cuenta) => SumDetallesIndividual({ cuenta }));
    const pasivos = cuentas.filter((cuenta) => cuenta.codigo.startsWith('2')).map((cuenta) => SumDetallesIndividual({ cuenta }));
    const patrimonios = cuentas.filter((cuenta) => cuenta.codigo.startsWith('3')).map((cuenta) => SumDetallesIndividual({ cuenta }));
    const resto = cuentas.filter((cuenta) => !cuenta.codigo.startsWith('1') && !cuenta.codigo.startsWith('2') && !cuenta.codigo.startsWith('3')).map((cuenta) => SumDetallesIndividual({ cuenta }));
    return response.json({
      comprobante: comprobanteApertura, detalles: {
        activos: {
          cuentas: activos,
        },
        pasivo_y_patrimonio: {
          cuentas: [...pasivos, ...patrimonios],
        },
        resto: {
          cuentas: resto,
        }
      }
    });
  }
  public async listByEmpresa({ request, response, auth }: HttpContextContract) {
    const { empresa_id } = request.all();
    const comprobantes = await Comprobante.query().where('empresa_id', empresa_id).where('usuario_id', auth.user?.id as number);
    return response.json(comprobantes);
  }
  public async cerrarComprobante({ request, response, auth }: HttpContextContract) {
    const id = request.param('id');
    if (!id) {

      return response.badRequest({ message: 'No se ha enviado el id del comprobante' });
    }
    const comprobante = await Comprobante.findOrFail(id);
    if (comprobante.usuario_id != auth.user?.id) {
      return response.unauthorized({ message: 'No tiene permiso para realizar esta acción' });
    }
    /* Seteamos a Cerrado */
    comprobante.estado = 'Cerrado';
    await comprobante.save();
    return response.json(comprobante);
  }
  public async anularComprobante({ request, response, auth }: HttpContextContract) {
    const id = request.param('id');
    if (!id) {
      return response.badRequest({ error: 'No se ha enviado el id del comprobante' });
    }
    const comprobante = await Comprobante.findOrFail(id);
    if (comprobante.usuario_id != auth.user?.id) {
      return response.unauthorized({ error: 'No tiene permiso para realizar esta acción' });
    }
    if (comprobante.estado == 'Cerrado') {
      return response.badRequest({ error: 'No se puede anular un comprobante cerrado' });
    }
    /* Seteamos a Anulado */
    comprobante.estado = 'Anulado';
    await comprobante.save();
    return response.json(comprobante);
  }

  public async crearComprobante({ request, response, auth }: HttpContextContract) {
    /* Validar primero */
    const schemaComprobante = schema.create({
      glosa: schema.string({ trim: true }),
      fecha: schema.date(),
      tc: schema.number(),
      tipo: schema.enum(['Ingreso', 'Egreso', 'Traspaso', 'Apertura', 'Ajuste']),
      empresa_id: schema.number(),
      moneda_id: schema.number(),
      /* Eso para crear el comprobante, pero para los detalles es otra cosa */
      detalles: schema.array().members(
        schema.object().members({
          glosa: schema.string(),
          cuenta_id: schema.number(),
          debe: schema.number.optional(),
          haber: schema.number.optional(),
        })
      ),
    });
    await request.validate({ schema: schemaComprobante }); /* Basura de validación */
    /* Verificar que si debe existe, haber es null y viceversa */
    const detalles = request.input('detalles');
    detalles.forEach((detalle) => {
      if (detalle.debe && detalle.haber) {
        return response.status(400).json({ message: "No puede haber un detalle con debe y haber" });
      }
      if (!detalle.debe && !detalle.haber) {
        return response.status(400).json({ message: "Se necesita detalle debe o haber" });
      }
      if (detalle.debe && detalle.debe < 0) {
        return response.status(400).json({ message: "Debe debe ser mayor a cero" });
      }
      if (detalle.haber && detalle.haber < 0) {
        return response.status(400).json({ message: "Haber debe ser mayor a cero" });
      }
    });
    const fechaVerificar = new Date(request.input('fecha'));
    const periodo = await Periodo.query().where('fecha_inicio', '<=', fechaVerificar).where('fecha_fin', '>=', fechaVerificar).where('estado', true)
      /* Doesn't have empresa_id, but gestion_id has empresa_id */
      .preload('gestion', (gestionQuery) => {
        gestionQuery.where('empresa_id', request.input('empresa_id'));
      }).first();
    if (!periodo?.gestion) {
      return response.status(400).json({ message: "No existe periodo abierto en esa fecha" });
    }
    //if (schemaComprobante.props.tipo === 'Apertura') {
    if (request.input('tipo') === 'Apertura') {
      /* Solo uno abierto por gestion */
      const gestion = await Gestion.query().where('id', periodo.gestion_id).where('estado', true).first();
      /* De esta gestión, agarramos sus fechas y buscamos otro comprobante abierto */
      if (!gestion) {
        return response.status(400).json({ message: "No existe gestión" });
      }
      const fecha_inicio_gestion = new Date(gestion.fecha_inicio.toString());
      const fecha_fin_gestion = new Date(gestion.fecha_fin.toString());

      const comprobante = await Comprobante.query().where('empresa_id', request.input('empresa_id')).where('tipo', 'Apertura').where('estado', 'Abierto').where('fecha', '>=', fecha_inicio_gestion).where('fecha', '<=', fecha_fin_gestion).first();
      if (comprobante) {
        return response.status(400).json({ message: "Ya existe un comprobante de apertura abierto para esta gestion(Fecha) :" + comprobante.serie });
      }
    }
    /* Validacion de cuenta último nivel */
    const cuentasVal = await Cuenta.query().where('empresa_id', request.input('empresa_id')).whereIn('id', detalles.map((detalle) => detalle.cuenta_id)).where('tipo', "DETALLE");
    if (cuentasVal.length !== detalles.length) {
      return response.status(400).json({ message: "Alguna cuenta no es de último nivel, chequea eso" });
    }
    const comprobanteSerie = await Comprobante.query().where('empresa_id', request.input('empresa_id'));
    const serie = comprobanteSerie.length + 1;
    const comprobante = new Comprobante();
    comprobante.serie = serie.toString();
    comprobante.glosa = request.input('glosa');
    comprobante.fecha = request.input('fecha');
    comprobante.tc = request.input('tc');
    comprobante.tipo = request.input('tipo') as TipoComprobante;
    comprobante.empresa_id = request.input('empresa_id');
    comprobante.moneda_id = request.input('moneda_id');
    comprobante.usuario_id = auth.user?.id as number;

    await comprobante.save();
    comprobante.related('comprobante_detalles').createMany(detalles.map((detalle, index) => {
      return {
        numero: (index + 1).toString(),
        glosa: detalle.glosa,
        cuenta_id: detalle.cuenta_id,
        monto_debe: detalle.debe ?? null,
        monto_haber: detalle.haber ?? null,
        monto_debe_alt: detalle.debe ? detalle.debe * request.input('tc') : null,
        monto_haber_alt: detalle.haber ? detalle.haber * request.input('tc') : null,
        usuario_id: auth.user?.id as number,
      };
    }
    ));
    return response.status(200).json({ message: "Creado con éxito" });

  }
}
