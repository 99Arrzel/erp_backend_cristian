import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Comprobante, { TipoComprobante } from 'App/Models/Comprobante';
import { schema } from '@ioc:Adonis/Core/Validator';
import Periodo from 'App/Models/Periodo';
import Gestion from 'App/Models/Gestion';
import Cuenta from 'App/Models/Cuenta';
import ComprobanteDetalle from 'App/Models/ComprobanteDetalle';
import Database from '@ioc:Adonis/Lucid/Database';
import { LucidModel, ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Orm';
import Empresa from 'App/Models/Empresa';
import Moneda from 'App/Models/Moneda';

interface TCuentaConSumasYSaldos {

  nombre: string;
  codigo: string;
  sumas_debe: number;
  sumas_haber: number;
  saldos_debe: number;
  saldos_haber: number;
}


/* Esta funcion agarra una lista de cuentas, y las suma hacia sus padres. */
function sumValuesToParents(accounts) {
  const accountsMap = accounts.reduce((acc, account) => {
    acc[account.id] = account;
    return acc;
  }, {});

  function propagateToParent(account) {
    if (account.padre_id) {
      const parent = accountsMap[account.padre_id];

      parent.total_debe = (parent.total_debe || 0) + (account.total_debe || 0);
      parent.total_haber = (parent.total_haber || 0) + (account.total_haber || 0);
      parent.total_debe_alt = (parent.total_debe_alt || 0) + (account.total_debe_alt || 0);
      parent.total_haber_alt = (parent.total_haber_alt || 0) + (account.total_haber_alt || 0);
    }
  }
  for (let i = accounts.length - 1; i >= 0; i--) {
    propagateToParent(accounts[i]);
  }
  return accounts;
}




async function logQueryBuilder<T extends LucidModel>(query: ModelQueryBuilderContract<T>) {
  console.log(query.toSQL().sql);
  console.log(query.toQuery());
  /* Don't return promise */
  return await query;
}
function swapMontos(accounts) {
  /* Swap between alts */
  accounts.forEach((account) => {
    const temp = account.total_debe_alt;
    account.total_debe_alt = account.total_debe;
    account.total_debe = temp;
    const temp2 = account.total_haber_alt;
    account.total_haber_alt = account.total_haber;
    account.total_haber = temp2;
  });

}
function calcularTotal(comprobante: Comprobante[], debe_o_haber: string) {
  let total = 0;
  comprobante.forEach((comprobante) => {
    comprobante.comprobante_detalles.forEach((detalle) => {
      if (debe_o_haber === 'debe') {
        total += detalle.monto_debe ?? 0;
      } else if (debe_o_haber === 'haber') {
        total += detalle.monto_haber ?? 0;
      }
    });
  });
  return total;
}
function swapMontosComprobante(comprobante: Comprobante) {

  comprobante.comprobante_detalles.forEach((detalle) => {
    const temp = detalle.monto_debe_alt;
    detalle.monto_debe_alt = detalle.monto_debe;
    detalle.monto_debe = temp;
    const temp2 = detalle.monto_haber_alt;
    detalle.monto_haber_alt = detalle.monto_haber;
    detalle.monto_haber = temp2;
  });
}
function swapMontosDetalles(detalle: ComprobanteDetalle) {
  const temp = detalle.monto_debe_alt;
  detalle.monto_debe_alt = detalle.monto_debe;
  detalle.monto_debe = temp;
  const temp2 = detalle.monto_haber_alt;
  detalle.monto_haber_alt = detalle.monto_haber;
  detalle.monto_haber = temp2;
}

/* Convertir monto_debe_alt a saldo */
function calcularSaldosCuentaDetalle(detalle: ComprobanteDetalle[]) {
  let saldo = 0;
  detalle.forEach((detalle) => {
    saldo += (detalle.monto_debe ?? 0) - (detalle.monto_haber ?? 0);
    detalle.monto_debe_alt = Math.abs(saldo);
  });
}

export default class ComprobantesController {


  public async comprobacionSumasYSaldos({ request, response, auth }: HttpContextContract) {

    const id_gestion = request.input('id_gestion');
    const id_moneda = request.input('id_moneda');

    if (!id_gestion) {
      return response.badRequest({ error: 'No se ha enviado el id de la gestión' });
    }
    const gestion = await Gestion.findOrFail(id_gestion);
    const fecha_inicio = new Date(gestion.fecha_inicio.toString());
    const fecha_fin = new Date(gestion.fecha_fin.toString());
    const empresa = await Empresa.findOrFail(gestion.empresa_id);
    let moneda;
    if (id_moneda) {
      moneda = await Moneda.findOrFail(id_moneda);
    }
    const comprobantes = await Comprobante.query()
      .where('estado', '!=', 'Anulado')
      .where('usuario_id', auth.user?.id as number)
      .whereBetween('fecha', [fecha_inicio, fecha_fin]).select('id');
    let cuentas = await Cuenta.query()
      .where('empresa_id', gestion.empresa_id)
      .where('tipo', 'DETALLE')
      .orderByRaw('inet_truchon(codigo)')
      .preload('comprobante_detalles', (query) => {
        query.whereIn('comprobante_id', comprobantes.map((comprobante) => comprobante.id))
          .preload('comprobante', (query) => {
            query.orderBy('fecha', 'asc');
          });
      });
    if (id_moneda) {
      cuentas.forEach((cuenta) => {
        cuenta.comprobante_detalles.forEach((detalle) => {
          if (detalle.comprobante.moneda_id == id_moneda) {
            swapMontosDetalles(detalle);
          }
        });
      });
    }


    let cuentasConSumasYSaldos: TCuentaConSumasYSaldos[] = [];

    cuentas.forEach((cuenta) => {
      let sumas_debe = 0;
      let sumas_haber = 0;
      let saldos_debe = 0;
      let saldos_haber = 0;
      cuenta.comprobante_detalles.forEach((detalle) => {
        sumas_debe += detalle.monto_debe ?? 0;
        sumas_haber += detalle.monto_haber ?? 0;
      });
      saldos_debe = sumas_debe - sumas_haber;
      saldos_haber = sumas_haber - sumas_debe;
      if (saldos_debe < 0) {
        saldos_debe = 0;
      }
      if (saldos_haber < 0) {
        saldos_haber = 0;
      }
      cuentasConSumasYSaldos.push({
        nombre: cuenta.nombre,
        codigo: cuenta.codigo,
        sumas_debe,
        sumas_haber,
        saldos_debe,
        saldos_haber,
      });
    });
    return response.json({
      cuentas: cuentasConSumasYSaldos,
      empresa,
      gestion,
      moneda,
      usuario: auth.user,
    });
  }
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
  public async ComprobanteLibroDiario({ request, response, auth }: HttpContextContract) {

    let fecha_inicio = new Date();
    let fecha_fin = new Date();
    const id_periodo = request.input('id_periodo');
    const id_moneda = request.input('id_moneda');
    const id_gestion = request.input('id_gestion'); //id, opcional
    if (!id_moneda) {
      return response.badRequest({ error: 'No se ha enviado el id de la moneda' });
    }
    if (!id_periodo) {
      return response.badRequest({ error: 'No se ha enviado el id del periodo o gestion' });
    }

    const periodo = await Periodo.findOrFail(id_periodo);
    if (id_gestion) { //obtenemos la gestion
      const gestion = await Gestion.findOrFail(id_gestion);
      fecha_inicio = new Date(gestion.fecha_inicio.toString());
      fecha_fin = new Date(gestion.fecha_fin.toString());
    } else { //Solo del periodo seleccionado
      fecha_inicio = new Date(periodo.fecha_inicio.toString());
      fecha_fin = new Date(periodo.fecha_fin.toString());
    }
    const comprobantes = await Comprobante.query()
      .where('estado', '!=', 'Anulado')
      .where('usuario_id', auth.user?.id as number)
      .whereBetween('fecha', [fecha_inicio, fecha_fin])
      .preload('comprobante_detalles', (query) => {
        query.preload('cuenta');
      });
    const gPeriodo = await Gestion.findOrFail(periodo.gestion_id);
    const empresa = await Empresa.findOrFail(gPeriodo.empresa_id);
    const moneda = await Moneda.findOrFail(id_moneda);
    comprobantes.forEach((comprobante) => {
      if (comprobante.moneda_id == id_moneda) { //Si es igual a la que se guarda (que es la alternativa), cambiamos
        swapMontosComprobante(comprobante);
      }

    });
    return response.json({
      por_gestion_o_periodo: id_gestion ? 'gestion' : 'periodo',
      comprobantes,
      empresa,
      moneda,
      periodo,
      gestion: gPeriodo,
      usuario: auth.user,
      total_debe: calcularTotal(comprobantes, 'debe'),
      total_haber: calcularTotal(comprobantes, 'haber'),
    });
  }

  public async ComprobanteLibroMayor({ request, response, auth }: HttpContextContract) {
    let fecha_inicio = new Date();
    let fecha_fin = new Date();
    const id_periodo = request.input('id_periodo');
    const id_moneda = request.input('id_moneda');
    const id_gestion = request.input('id_gestion'); //id, opcional
    if (!id_moneda) {
      return response.badRequest({ error: 'No se ha enviado el id de la moneda' });
    }
    if (!id_periodo) {
      return response.badRequest({ error: 'No se ha enviado el id del periodo o gestion' });
    }
    const periodo = await Periodo.findOrFail(id_periodo);
    if (id_gestion) { //obtenemos la gestion
      const gestion = await Gestion.findOrFail(id_gestion);
      fecha_inicio = new Date(gestion.fecha_inicio.toString());
      fecha_fin = new Date(gestion.fecha_fin.toString());
    } else { //Solo del periodo seleccionado
      fecha_inicio = new Date(periodo.fecha_inicio.toString());
      fecha_fin = new Date(periodo.fecha_fin.toString());

    }
    const comprobantes = await Comprobante.query()
      .where('estado', '!=', 'Anulado')
      .where('usuario_id', auth.user?.id as number)
      .whereBetween('fecha', [fecha_inicio, fecha_fin]).select('id');
    const gPeriodo = await Gestion.findOrFail(periodo.gestion_id);
    const empresa = await Empresa.findOrFail(gPeriodo.empresa_id);
    const moneda = await Moneda.findOrFail(id_moneda);
    const cuentas = await Cuenta.query()
      .where('empresa_id', empresa.id)
      .preload('comprobante_detalles', (query) => {
        query.whereIn('comprobante_id', comprobantes.map((comprobante) => comprobante.id))
          .preload('comprobante', (query) => {
            query.orderBy('fecha', 'asc');
          });
      })
      .orderByRaw('inet_truchon(codigo) asc');
    /* Filter cuentas donde comprobante_detalles.length === 0 */
    const cuentasFiltradas = cuentas.filter((cuenta) => cuenta.comprobante_detalles.length > 0);
    cuentasFiltradas.forEach((cuenta) => {
      cuenta.comprobante_detalles.forEach((detalle) => {
        if (detalle.comprobante.moneda_id == id_moneda) { //Si es igual a la que se guarda (que es la alternativa), cambiamos

          swapMontosDetalles(detalle);
        }

      });
    });
    cuentasFiltradas.forEach((cuenta) => {
      calcularSaldosCuentaDetalle(cuenta.comprobante_detalles);
    });
    return response.json({
      por_gestion_o_periodo: id_gestion ? 'gestion' : 'periodo',
      cuentas: cuentasFiltradas,
      empresa,
      periodo,
      gestion: gPeriodo,
      moneda,
      usuario: auth.user,
    });
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
    const empresa = await Empresa.findOrFail(gestion.empresa_id);
    const moneda = await Moneda.findOrFail(id_moneda);
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
    const cuentas = await logQueryBuilder(Cuenta.query()
      .select('id', 'codigo', 'nombre', 'padre_id', 'nivel', 'tipo')
      .where('empresa_id', gestion.empresa_id)
      .whereIn('id', ids_cuentas2)
      .orderByRaw("inet_truchon(codigo)")
      .withAggregate('comprobante_detalles', (query) => {
        query.whereIn('id', ids_detalles);
        query.sum('monto_debe').as('total_debe');
      })
      .withAggregate('comprobante_detalles', (query) => {
        query.whereIn('id', ids_detalles);
        query.sum('monto_haber').as('total_haber');
      })
      .withAggregate('comprobante_detalles', (query) => {
        query.whereIn('id', ids_detalles);
        query.sum('monto_debe_alt').as('total_debe_alt');
      })
      .withAggregate('comprobante_detalles', (query) => {
        query.whereIn('id', ids_detalles);
        query.sum('monto_haber_alt').as('total_haber_alt');
      })
    );


    let cuentas_detalles = cuentas.map((cuenta) => {
      return {
        ...cuenta.$extras,
        ...cuenta.toJSON() as Cuenta,
      };
    });
    cuentas_detalles = sumValuesToParents(cuentas_detalles);
    if (comprobanteApertura.moneda_id == id_moneda) {
      swapMontos(cuentas_detalles);
    }
    const activos = cuentas_detalles.filter((cuenta) => cuenta.codigo.startsWith('1'));
    const pasivos = cuentas_detalles.filter((cuenta) => cuenta.codigo.startsWith('2'));
    const patrimonios = cuentas_detalles.filter((cuenta) => cuenta.codigo.startsWith('3'));
    const resto = cuentas_detalles.filter((cuenta) => !cuenta.codigo.startsWith('1') && !cuenta.codigo.startsWith('2') && !cuenta.codigo.startsWith('3'));
    return response.json({
      comprobante: comprobanteApertura,
      detalles: {
        activos: {
          cuentas: activos,
        },
        pasivo_y_patrimonio: {
          cuentas: [...pasivos, ...patrimonios],
        },
        resto: {
          cuentas: resto,
        }
      },
      empresa,
      moneda,
      usuario: auth.user,
      gestion
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
    const cuentasVal = await Cuenta.query()
      .where('empresa_id', request.input('empresa_id'))
      .whereIn('id', detalles.map((detalle) => detalle.cuenta_id))
      .where('tipo', "DETALLE").distinct('id');
    //detalles disntict ids igual
    const idsNoRepetidos = detalles.map((detalle) => detalle.cuenta_id).filter((value, index, self) => self.indexOf(value) === index);
    if (cuentasVal.length !== idsNoRepetidos.length) {
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
