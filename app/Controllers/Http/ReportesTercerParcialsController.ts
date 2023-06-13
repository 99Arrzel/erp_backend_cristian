import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import Cuenta from 'App/Models/Cuenta';
import Gestion from 'App/Models/Gestion';
import Moneda from 'App/Models/Moneda';
import Nota from 'App/Models/Nota';
import { logQueryBuilder, sumValuesToParents, swapMontos } from './ComprobantesController';
import ComprobanteDetalle from 'App/Models/ComprobanteDetalle';
import EmpresaMoneda from 'App/Models/EmpresaMoneda';

export default class ReportesTercerParcialsController {
  //Una nota de compra
  public async nota_compra({ request, response, auth }: HttpContextContract) {
    const id_nota = request.input('id_nota');
    if (id_nota == null) {
      return response.status(400).json({ message: 'El id de la nota es requerido' });
    }
    const nota = await Nota.query().where('id', id_nota).where('usuario_id', auth.user?.id as number)
      .preload('lotes', (q) => {
        q.preload('articulo');
      })
      .first();
    if (!nota) {
      return response.status(400).json({ message: 'La nota no existe' });
    }
    const empresa = await nota.related('empresa').query().first();
    if (empresa == null) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }


    return response.status(200).json({
      nota: nota,
      usuario: auth.user,
      empresa: empresa
    });
  }
  //Una nota de venta
  public async nota_venta({ request, response, auth }: HttpContextContract) {
    const id_nota = request.input('id_nota');
    if (id_nota == null) {
      return response.status(400).json({ message: 'El id de la nota es requerido' });
    }
    const nota = await Nota.query().where('id', id_nota).where('usuario_id', auth.user?.id as number)
      .preload('detalles', (q) => {
        q.preload('lote', (qp) => {
          qp.preload('articulo');
        });
      }
      ).firstOrFail();
    if (!nota) {
      return response.status(400).json({ message: 'La nota no existe' });
    }
    const empresa = await nota.related('empresa').query().first();
    if (empresa == null) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }


    return response.status(200).json({
      nota: nota,
      usuario: auth.user,
      empresa: empresa
    });
  }

  //Reporte de balance general
  public async balance_general({ request, response, auth }: HttpContextContract) {
    const id_gestion = request.input('id_gestion');
    const id_moneda = request.input('id_moneda');

    if (id_gestion == null) {
      return response.status(400).json({ message: 'El id de la gestion es requerido' });
    }
    if (id_moneda == null) {
      return response.status(400).json({ message: 'El id de la moneda es requerido' });
    }

    //Como balance inicial pero con la gestion y moneda especificada
    const gestion = await Gestion.query().where('id', id_gestion).where('usuario_id', auth.user?.id as number).first();
    if (!gestion) {
      return response.status(400).json({ message: 'La gestion no existe' });
    }
    const empresa = await gestion.related('empresa').query().first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const moneda = await Moneda.query().where('id', id_moneda).where('usuario_id', auth.user?.id as number).first();
    if (!moneda) {
      return response.status(400).json({ message: 'La moneda no existe' });
    }
    const fecha_inicio = new Date(String(gestion.fecha_inicio));
    const fecha_fin = new Date(String(gestion.fecha_fin));
    //Comprobantes en el rango
    const comprobantes = await empresa.related('comprobantes').query()
      .whereBetween('fecha', [fecha_inicio, fecha_fin]).where('estado', '!=', 'Anulado');
    const comprobantes_detalles_ids = (await ComprobanteDetalle.query().whereIn('comprobante_id', comprobantes.map((comprobante) => comprobante.id))).map((v) => v.id);
    //Ahora las cuentas
    const cuentas = await empresa.related('cuentas')
      //Donde los detalles de los comprobantes le pertenezcan a los comprobantes
      .query().whereHas('comprobante_detalles', (query) => {
        query.whereIn('comprobante_id', comprobantes.map((comprobante) => comprobante.id));
      }).distinct();
    //Hay que traer la suma de las cuentas a sus padres, así que armamos el arbol
    const ids_finales_cuentas = (await Database.query()
      .withRecursive('padre', (query) => {
        // The base case: Select the rows with the child IDs
        query
          .select('id', 'padre_id')
          .from('cuentas')
          .whereIn('id', cuentas.map((cuenta) => cuenta.id))
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
    //Ahora si, traemos las cuentas con sus sumas
    const cuentas_con_sumas = await logQueryBuilder(Cuenta.query()
      .select('id', 'codigo', 'nombre', 'padre_id', 'nivel', 'tipo')
      .where('empresa_id', empresa.id)
      .whereIn('id', ids_finales_cuentas)
      .orderByRaw('inet_truchon(codigo)')
      .withAggregate('comprobante_detalles', (query) => {
        query.whereIn('id', comprobantes_detalles_ids);
        query.sum('monto_debe').as('total_debe');
      })
      .withAggregate('comprobante_detalles', (query) => {
        query.whereIn('id', comprobantes_detalles_ids);
        query.sum('monto_haber').as('total_haber');
      })
      .withAggregate('comprobante_detalles', (query) => {
        query.whereIn('id', comprobantes_detalles_ids);
        query.sum('monto_debe_alt').as('total_debe_alt');
      })
      .withAggregate('comprobante_detalles', (query) => {
        query.whereIn('id', comprobantes_detalles_ids);
        query.sum('monto_haber_alt').as('total_haber_alt');
      })
    );
    //Ahora si, armamos el balance
    let cuentas_detalles = cuentas_con_sumas.map((cuenta) => {
      return {
        ...cuenta.$extras,
        ...cuenta.toJSON() as Cuenta
      };
    });
    //valores a padres
    cuentas_detalles = sumValuesToParents(cuentas_detalles);
    //Finalente se chequea la moneda, si es la moneda de la empresa o la de tc y dependiendo de eso hacemos el swap de cuentas
    //Primero obtener la última moneda
    const ultima_moneda_detalles = await EmpresaMoneda.query().where('empresa_id', empresa.id).where('activo', true).first();

    if (ultima_moneda_detalles?.moneda_principal_id !== moneda.id) {
      //Hay que hacer el swap
      swapMontos(cuentas_detalles);
    }
    //Ahora si, retornamos
    const activos = cuentas_detalles.filter((cuenta) => cuenta.codigo.startsWith('1'));
    const pasivos = cuentas_detalles.filter((cuenta) => cuenta.codigo.startsWith('2'));
    const patrimonio = cuentas_detalles.filter((cuenta) => cuenta.codigo.startsWith('3'));

    return response.status(200).json({
      empresa: empresa,
      gestion: gestion,
      moneda: moneda,
      usuario: auth.user,
      activos: activos,
      pasivos: pasivos,
      patrimonio: patrimonio,
    });
  }
  //Reporte de estado de resultados
  public async estado_resultados({ request, response, auth }: HttpContextContract) {
    //se sumariza toda la cuenta de ingresos 4.%  //Esto es el to tal del haber menos el debe
    //se sumariza toda la cuenta de costos 5.1.% //aca esto es el debe menos el haber
    //se sumariza toda la cuenta de gastos 5.2.% //aca esto es el debe menos el haber
    //Esto es por gestiones de una empresa en una moneda
    const id_gestion = request.input('id_gestion');
    const id_moneda = request.input('id_moneda');
    if (id_gestion == null) {
      return response.status(400).json({ message: 'El id de la gestion es requerido' });
    }
    if (id_moneda == null) {
      return response.status(400).json({ message: 'El id de la moneda es requerido' });
    }



    const gestion = await Gestion.query().where('id', id_gestion).where('usuario_id', auth.user?.id as number).first();
    if (!gestion) {
      return response.status(400).json({ message: 'La gestion no existe' });
    }
    const moneda = await Moneda.query().where('id', id_moneda).where('usuario_id', auth.user?.id as number).first();
    if (!moneda) {
      return response.status(400).json({ message: 'La moneda no existe' });
    }
    const empresa = await gestion.related('empresa').query().firstOrFail();

    //traemos los comprobantes en x fecha
    const detalles = await ComprobanteDetalle.query()
      .whereHas('comprobante', (query) => {
        query.where('empresa_id', empresa.id);
        query.whereBetween('fecha', [(new Date(String(gestion.fecha_inicio))), (new Date(String(gestion.fecha_fin)))]);
      })
      .andWhereHas('cuenta', (query) => {
        query.where('codigo', 'like', '4.%').orWhere('codigo', 'like', '5.1.%').orWhere('codigo', 'like', '5.2.%');
      }).andWhereHas('comprobante', (query) => {
        //Diferente de Anulado
        query.where('estado', '!=', 'Anulado');
      });
    let cuentas_con_sumas: Cuenta[];
    //ultima moneda
    const ultima_moneda_detalles = await EmpresaMoneda.query().where('empresa_id', empresa.id).where('activo', true).first();

    if (ultima_moneda_detalles?.moneda_principal_id === moneda.id) {
      cuentas_con_sumas = await logQueryBuilder(Cuenta.query()
        .where('empresa_id', empresa.id)
        .where('tipo', "DETALLE")
        //.where('codigo', 'like', '4.%').orWhere('codigo', 'like', '5.1.%').orWhere('codigo', 'like', '5.2.%')
        .andWhere((query) => {
          query.where('codigo', 'like', '4.%').orWhere('codigo', 'like', '5.1%').orWhere('codigo', 'like', '5.2%');
        })
        .whereIn('id', detalles.map((detalle) => detalle.cuenta_id))
        .preload('comprobante_detalles', (query) => {
          query.whereIn('id', detalles.map((detalle) => detalle.id));
        })
        .withAggregate('comprobante_detalles', (query) => {
          query.whereIn('id', detalles.map((detalle) => detalle.id));
          query.sum('monto_haber').as('total_haber');
        })
        .withAggregate('comprobante_detalles', (query) => {
          query.whereIn('id', detalles.map((detalle) => detalle.id));
          query.sum('monto_debe').as('total_debe');
        })
        //sum de todo
        //eliminamos donde la suma de debe y haber sea 0
        //.havingRaw('sum(comprobante_detalles.total_debe) <> sum(comprobante_detalles.total_haber)')
        .orderByRaw('inet_truchon(codigo)')
      );
    }
    else {
      cuentas_con_sumas = await logQueryBuilder(Cuenta.query()
        .where('empresa_id', empresa.id)
        .where('tipo', "DETALLE")
        //.where('codigo', 'like', '4.%').orWhere('codigo', 'like', '5.1.%').orWhere('codigo', 'like', '5.2.%')
        .andWhere((query) => {
          query.where('codigo', 'like', '4.%').orWhere('codigo', 'like', '5.1%').orWhere('codigo', 'like', '5.2%');
        })
        .whereIn('id', detalles.map((detalle) => detalle.cuenta_id))
        .preload('comprobante_detalles', (query) => {
          query.whereIn('id', detalles.map((detalle) => detalle.id));
        })
        .withAggregate('comprobante_detalles', (query) => {
          query.whereIn('id', detalles.map((detalle) => detalle.id));
          query.sum('monto_haber_alt').as('total_haber');
        })
        .withAggregate('comprobante_detalles', (query) => {
          query.whereIn('id', detalles.map((detalle) => detalle.id));
          query.sum('monto_debe_alt').as('total_debe');
        })
        //sum de todo
        //eliminamos donde la suma de debe y haber sea 0
        //.havingRaw('sum(comprobante_detalles.total_debe) <> sum(comprobante_detalles.total_haber)')
        .orderByRaw('inet_truchon(codigo)')
      );
    }
    console.log("===================");

    console.log(cuentas_con_sumas.map((cuenta) => cuenta.codigo).join(","));

    //Ahora si, armamos el balance
    const cuentas_detalles = cuentas_con_sumas.map((cuenta) => {
      return {
        ...cuenta.toObject(),
        ...cuenta.$extras,
        ...cuenta.toJSON() as Cuenta
      };
    });

    console.log("=====22222=======");
    console.log(cuentas_detalles.map((cuenta) => cuenta.codigo).join(","));

    console.log("TWTFWEA");
    console.log(cuentas_detalles);

    let ingresos = cuentas_detalles.filter((cuenta) => cuenta.codigo.startsWith('4')) as any;
    ingresos.forEach((ingreso) => {
      ingreso.total = ingreso.total_haber - ingreso.total_debe;

    });

    const costos = cuentas_detalles.filter((cuenta) => cuenta.codigo.startsWith('5.1')) as any;
    costos.forEach((costo) => {
      costo.total = costo.total_debe - costo.total_haber;
    });

    const gastos = cuentas_detalles.filter((cuenta) => cuenta.codigo.startsWith('5.2')) as any;

    gastos.forEach((gasto) => {
      gasto.total = gasto.total_debe - gasto.total_haber;
    });

    //Debemos calcular la utilidad bruta que es ingresos - costos
    const totalIngresos = ingresos.reduce((acc, cuenta: any) => acc + cuenta.total_haber - cuenta.total_debe, 0);
    const totalCostos = costos.reduce((acc, cuenta: any) => acc + cuenta.total_debe - cuenta.total_haber, 0);
    const utilidadBruta = totalIngresos - totalCostos;
    //Utilidad o deficit con utilidadBruta - gastos
    const totalGastos = gastos.reduce((acc, cuenta: any) => acc + cuenta.total_debe - cuenta.total_haber, 0);
    const utilidadNeta = utilidadBruta - totalGastos;
    return response.status(200).json({
      empresa: empresa,
      gestion: gestion,
      moneda: moneda,
      usuario: auth.user,
      ingresos: ingresos,
      costos: costos,
      gastos: gastos,
      totalIngresos: totalIngresos,
      totalCostos: totalCostos,
      utilidadBruta: utilidadBruta,
      totalGastos: totalGastos,
      utilidadNeta: utilidadNeta,
    });
  }
};
