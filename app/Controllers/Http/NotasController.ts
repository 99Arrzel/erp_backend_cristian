import { DateTime } from 'luxon';
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import Moneda from 'App/Models/Moneda';
import CuentasIntegracion from 'App/Models/CuentasIntegracion';
import Comprobante from 'App/Models/Comprobante';
type Lotes = {
  articulo_id: number,
  cantidad: number,
  precio: number,
  fecha_vencimiento: string | null,
};
export default class NotasController {
  public async lista_notas({ request, response, auth }: HttpContextContract) {
    const id = request.input('id');
    const tipo = request.input('tipo');
    if (tipo == null || tipo == '' || tipo == undefined) {
      return response.status(400).json({ message: 'El tipo de nota es requerido' });
    }
    if (tipo != 'compra' && tipo != 'venta') {
      return response.status(400).json({ message: 'El tipo de nota no es válido' });
    }
    if (id == null) {
      return response.status(400).json({ message: 'El id de la empresa es requerido' });
    }
    const empresa = await auth.user?.related('empresas').query().where('id', id).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const notas = await empresa.related('notas').query().where('tipo', tipo).preload('lotes'
      , (query) => {
        query.preload('articulo', (query) => {
          query.preload('categorias');
        });
      }
    ).preload('usuario').orderBy('id', 'desc');
    return response.status(200).json(notas);
  }
  public async crear_compra({ request, response, auth }: HttpContextContract) {
    const data = request.only(['fecha', 'descripcion', 'empresa_id', 'lotes']);
    const empresa = await auth.user?.related('empresas').query().where('id', data.empresa_id).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const nro_nota = await empresa.related('notas').query().where('tipo', 'compra').max('nro_nota');
    const total = data.lotes.reduce((acc, lote: Lotes) => {
      return acc + lote.cantidad * lote.precio;
    }, 0);

    const trx = await Database.transaction();
    try {
      let id_comprobante = null as null | number;
      //Integración compras-comprobante, solo si integración existe y está activado
      const integracion = await CuentasIntegracion.query().where('empresa_id', empresa.id).first();
      if (integracion && integracion.estado) {
        //Al grabar una compra se debe generar un comprobante contable de Egreso con la misma fecha de la compra y en la Moneda Principal. (por lo tanto debe existir un periodo para dicho comprobante, si no no se puede grabar ni la nota, mucho menos el comprobante).
        //moneda principal:
        const moneda = await empresa.related('empresa_monedas').query().orderBy('id', 'desc').limit(2);
        if (moneda.length <= 1) { //No hay moneda alternativa si solo hay 1 registro
          return response.status(400).json({ message: 'No se puede anular la nota porque no hay moneda alternativa' });
        }
        const moneda_principal = await Moneda.query().where('id', moneda[0].moneda_principal_id).firstOrFail();
        //Tiene que haber un periodo abierto en la fecha
        const periodo = await empresa.related('gestiones').query()
          //De las gestiones de la empresa, hay periodos
          .whereHas('periodos', (query) => {
            //De los periodos, hay que ver si uno está abierto y está en la fecha de la nota
            query.where('fecha_inicio', '<=', data.fecha).where('fecha_fin', '>=', data.fecha).where('estado', true);
          })
          .first();
        if (!periodo) {
          throw new Error('No hay un periodo abierto en la fecha de la nota');
        }
        //serie de comprobante
        const serie = await empresa.related('comprobantes').query().max('serie');
        //crear comprobante
        const comprobante = await empresa.related('comprobantes').create({
          fecha: data.fecha,
          glosa: "Compra de mercaderías",
          tipo: 'Egreso',
          estado: 'Abierto',
          serie: serie[0]['max'] + 1,
          tc: moneda[0].cambio,
          moneda_id: moneda_principal.id,
          usuario_id: auth.user?.id as number,
        });
        id_comprobante = comprobante.id;
        //detalles comprobante
        //Compras
        const porcentaje_credito_fiscal = 0.13;
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.compras_id,
          monto_haber: total * 0.87,
          monto_haber_alt: (total * 0.87) * moneda[0].cambio,
          monto_debe: 0,
          monto_debe_alt: 0,
          glosa: "Compra de mercaderías",
        });
        //Credito Fiscal
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.credito_fiscal_id,
          monto_debe: total * porcentaje_credito_fiscal,
          monto_debe_alt: (total * porcentaje_credito_fiscal) * moneda[0].cambio,
          monto_haber: 0,
          monto_haber_alt: 0,
          glosa: "Compra de mercaderías",
        });
        //caja
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.caja_id,
          monto_debe: total * 0.13,
          monto_debe_alt: (total * 0.13) * moneda[0].cambio,
          monto_haber: 0,
          monto_haber_alt: 0,
          glosa: "Compra de mercaderías",
        });

      }
      const notaCreada = await empresa.related('notas')
        .create({
          nro_nota: nro_nota[0]['max'] + 1,
          fecha: data.fecha,
          descripcion: data.descripcion,
          total: total,
          tipo: 'compra',
          empresa_id: data.empresa_id,
          usuario_id: auth.user?.id as number,
          comprobante_id: id_comprobante,
          estado: 'activo',
        });
      //Asignar lotes, hay que crearlos.
      await Promise.all(data.lotes.map(async (lote: Lotes) => {
        const articulo = await empresa.related('articulos').query().where('id', lote.articulo_id).first();
        if (!articulo) {
          throw new Error('El artículo no existe');
        }
        const nro_lote_articulo = await articulo.related('lotes').query().max('nro_lote');
        const loteCreado = await notaCreada.related('lotes').create({
          cantidad: lote.cantidad,
          precio_compra: lote.precio,
          fecha_vencimiento: lote.fecha_vencimiento ? (DateTime.fromJSDate(new Date(lote.fecha_vencimiento))) : null,
          articulo_id: lote.articulo_id,
          nro_lote: nro_lote_articulo[0]['max'] + 1,
          stock: lote.cantidad,
          fecha_ingreso: DateTime.fromJSDate(new Date(data.fecha)),
        });
        //Actualizar stock del articulo
        articulo.stock = articulo.stock + lote.cantidad;
        articulo.save();
        return loteCreado;
      }));
      await notaCreada.load('lotes', (query) => {
        query.preload('articulo', (query) => {
          query.preload('categorias');
        });
      });
      await trx.commit();
      return response.status(200).json(notaCreada);
    } catch (error) {
      await trx.rollback();
      return response.status(400).json({ message: 'No se pudo crear la nota ' + error.message });
    }
  }
  public async anular_compra({ request, response, auth }: HttpContextContract) {
    //Cuando se anule una nota se deben anular todos los lotes que contenía la nota.
    const data = request.only(['id', 'empresa_id']);
    const empresa = await auth.user?.related('empresas').query().where('id', data.empresa_id).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const nota = await empresa.related('notas').query().where('id', data.id).first();
    if (!nota) {
      return response.status(400).json({ message: 'La nota no existe' });
    }
    if (nota.estado == 'anulado') {
      return response.status(400).json({ message: 'La nota ya está anulada' });
    }
    const trx = await Database.transaction();
    try {
      if (nota.comprobante_id) {
        const comprobante = await Comprobante.findOrFail(nota.comprobante_id);
        comprobante.estado = 'Anulado';
        comprobante.save();
      }
      await Promise.all(nota.lotes.map(async (lote) => {
        if (lote.cantidad != lote.stock) {
          throw new Error('No se puede anular la nota porque ya se vendió parte del lote');
        }
        lote.estado = 'anulado';
        lote.save();
        //Actualizar stock del articulo
        const articulo = await empresa.related('articulos').query().where('id', lote.articulo_id).first();
        if (!articulo) {
          throw new Error('El artículo no existe');
        }

        articulo.stock = articulo.stock - lote.cantidad;
        articulo.save();
      }));
      nota.estado = 'anulado';
      nota.save();
      await trx.commit();
      return response.status(200).json({ message: 'Nota anulada' });
    } catch (error) {
      await trx.rollback();
      return response.status(400).json({ message: 'No se pudo anular la nota ' + error.message });
    }
  }
}
