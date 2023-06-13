import { DateTime } from 'luxon';
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Database from '@ioc:Adonis/Lucid/Database';
import Moneda from 'App/Models/Moneda';
import CuentasIntegracion from 'App/Models/CuentasIntegracion';
import Comprobante from 'App/Models/Comprobante';
import Lote from 'App/Models/Lote';
type Lotes = {
  articulo_id: number,
  cantidad: number,
  precio: number,
  fecha_vencimiento: string | null,
};
type LotesVenta = {
  lote_id: number,
  cantidad: number,
  precio: number,
};
export default class NotasController {
  public async una_nota({ request, response, auth }: HttpContextContract) {
    const id = request.input('id');
    if (id == null) {
      return response.status(400).json({ message: 'El id de la nota es requerido' });
    }
    const nota = await auth.user?.related('notas').query().where('id', id)
      .preload('lotes'
        , (query) => {
          query.preload('articulo', (query) => {
            query.preload('categorias');
          });
        }
      )
      .preload('usuario')

      .first();
    if (!nota) {
      return response.status(400).json({ message: 'La nota no existe' });
    }
    return response.status(200).json(nota);
  }
  public async una_nota_venta({ request, response, auth }: HttpContextContract) {
    const id = request.input('id');
    if (id == null) {
      return response.status(400).json({ message: 'El id de la nota es requerido' });
    }
    const nota = await auth.user?.related('notas').query().where('id', id)
      .preload('detalles',
        (query) => {
          query.preload('lote', (query) => {
            query.preload('articulo', (query) => {
              query.preload('categorias');
            });
          });
        }
      ).first();
    if (!nota) {
      return response.status(400).json({ message: 'La nota no existe' });
    }
    return response.status(200).json(nota);
  }

  public async ultimo_numero({ request, response, auth }: HttpContextContract) {
    /* de empresa, por tipo compra o venta */
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
    const nro_nota = await empresa.related('notas').query().where('tipo', tipo).max('nro_nota');
    return response.status(200).json({ ultimo: (nro_nota[0].$extras['max'] ?? 0) + 1 });
  }

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

  public async crear_venta({ request, response, auth }: HttpContextContract) {
    const data = request.only(['fecha', 'descripcion', 'empresa_id', 'lotes']);
    const empresa = await auth.user?.related('empresas').query().where('id', data.empresa_id).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const nro_nota = await empresa.related('notas').query().where('tipo', 'venta').max('nro_nota');
    const total = data.lotes.reduce((acc, lote: LotesVenta) => {
      return acc + lote.cantidad * lote.precio;
    }, 0);
    const trx = await Database.transaction({
      isolationLevel: 'read uncommitted',
    });
    console.log(trx);

    try {
      let id_comprobante = null as null | number;
      //Integración compras-comprobante, solo si integración existe y está activado
      const integracion = await CuentasIntegracion.query().where('empresa_id', empresa.id).first();
      if (integracion && integracion.estado) {
        /* Al grabar una venta se debe generar un comprobante contable de Ingreso con la misma fecha de la venta y en la Moneda Principal. (por lo tanto debe existir un periodo para dicho comprobante, si no existe un periodo no debe dejar grabar la nota y tampoco generar un comprobante). */
        //moneda principal:
        const moneda = await empresa.related('empresa_monedas').query().orderBy('id', 'desc').limit(2);
        if (moneda.length <= 1) { //No hay moneda alternativa si solo hay 1 registro
          return response.status(400).json({ message: 'No se puede crear la nota porque no hay moneda alternativa' });
        }
        const moneda_principal = await Moneda.query().where('id', moneda[0].moneda_principal_id).firstOrFail();
        //Tiene que haber un periodo abierto en la fecha
        const periodo = await empresa.related('gestiones').query()
          //De las gestiones de la empresa, hay periodos
          .whereHas('periodos', (query) => {
            //De los periodos, hay que ver si uno está abierto y está en la fecha de la nota
            query.where('fecha_inicio', '<=', data.fecha).where('fecha_fin', '>=', data.fecha).where('estado', true);
          }
          )
          .first();
        if (!periodo) {
          throw new Error('No hay un periodo abierto en la fecha de la nota');
        }
        //serie de comprobante
        const serie = await empresa.related('comprobantes').query().max('serie');
        //crear comprobante
        const comprobante = await empresa.useTransaction(trx).related('comprobantes').create({
          fecha: data.fecha,
          glosa: "Venta de mercaderías",
          tipo: 'Ingreso',
          estado: 'Abierto',
          //nro_nota[0].$extras['max']
          serie: (Number(serie[0].$extras['max'] ?? 0) + 1).toString(),
          tc: moneda[0].cambio,
          moneda_id: moneda_principal.id,
          usuario_id: auth.user?.id as number,
        });
        id_comprobante = comprobante.id;
        //detalles comprobante
        //El detalle de las cuentas sera :Caja...... XXX (Debe)Impuesto a las Transacciones (IT) ... XXX (Debe)Ventas .... XXX (Haber)Debito Fiscal .... XXX (Haber)IT por Pagar .... XXX (Haber)
        //Caja
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.caja_id,
          monto_debe: total,
          monto_debe_alt: total * moneda[0].cambio,
          monto_haber: 0,
          monto_haber_alt: 0,
          glosa: "Venta de mercaderías",
          numero: "1",
          usuario_id: auth.user?.id as number,
        });
        //IT 3% del total
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.it_id,
          monto_debe: total * 0.03,
          monto_debe_alt: (total * 0.03) * moneda[0].cambio,
          monto_haber: 0,
          monto_haber_alt: 0,
          glosa: "Venta de mercaderías",
          numero: "2",
          usuario_id: auth.user?.id as number,
        });
        //Ventas (caja menos débito fiscal, qeu es 13% del total)
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.ventas_id,
          monto_debe: 0,
          monto_debe_alt: 0,
          monto_haber: total * 0.87,
          monto_haber_alt: (total * 0.87) * moneda[0].cambio,
          glosa: "Venta de mercaderías",
          numero: "3",
          usuario_id: auth.user?.id as number,
        });
        //Debito Fiscal
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.debito_fiscal_id,
          monto_debe: 0,
          monto_debe_alt: 0,
          monto_haber: total * 0.13,
          monto_haber_alt: (total * 0.13) * moneda[0].cambio,
          glosa: "Venta de mercaderías",
          numero: "4",
          usuario_id: auth.user?.id as number,
        });
        // IT por pagar
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.it_por_pagar_id,
          monto_debe: 0,
          monto_debe_alt: 0,
          monto_haber: total * 0.03,
          monto_haber_alt: (total * 0.03) * moneda[0].cambio,
          glosa: "Venta de mercaderías",
          numero: "5",
          usuario_id: auth.user?.id as number,
        });

      }
      const notaCreada = await empresa.useTransaction(trx).related('notas')
        .create({
          //nro_nota[0].$extras['max']
          nro_nota: (nro_nota[0].$extras['max'] ?? 0) + 1,
          fecha: data.fecha,
          descripcion: data.descripcion,
          total: total,
          tipo: 'venta',
          empresa_id: data.empresa_id,
          usuario_id: auth.user?.id as number,
          comprobante_id: id_comprobante,
          estado: 'activo',
        });


      //Asignar detalles, hay que crearlos.
      await Promise.all(data.lotes.map(async (lote: LotesVenta) => {
        const de_lote = await Lote.query().useTransaction(trx).where('id', lote.lote_id).first();
        if (!de_lote) {
          throw new Error('El lote no existe');
        }
        if (de_lote.stock < lote.cantidad) {
          throw new Error('No hay suficiente stock en lote' + de_lote.nro_lote);
        }
        const articulo = await empresa.useTransaction(trx).related('articulos').query().where('id', de_lote.articulo_id).first();
        if (!articulo) {
          throw new Error('El artículo no existe');
        }

        de_lote.stock = de_lote.stock - lote.cantidad;
        await de_lote.save();
        //Crear detalle
        const detalle = await notaCreada.useTransaction(trx).related('detalles').create({
          cantidad: lote.cantidad,
          precio_venta: lote.precio,
          lote_id: lote.lote_id,
          nota_id: notaCreada.id,
        });
        return detalle;
      }));


      await notaCreada.load('detalles', (query) => {
        query.preload('lote', (query) => {
          query.preload('articulo', (query) => {
            query.preload('categorias');
          });
        });
      }
      );
      await trx.commit();
      //TODO: sync de stock pendiente
      return response.status(200).json(notaCreada);
    }
    catch (error) {
      await trx.rollback();
      console.log(error);
      return response.status(400).json({ message: 'No se pudo crear la nota ' + error.message });
    }
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
          return response.status(400).json({ message: 'No se puede crear la nota porque no hay moneda alternativa' });
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
        console.log(serie, "Max serie");
        //crear comprobante
        const comprobante = await empresa.useTransaction(trx).related('comprobantes').create({
          fecha: data.fecha,
          glosa: "Compra de mercaderías",
          tipo: 'Egreso',
          estado: 'Abierto',
          //nro_nota[0].$extras['max']
          serie: (Number(serie[0].$extras['max'] ?? 0) + 1).toString(),
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
          monto_debe: total * 0.87,
          monto_debe_alt: (total * 0.87) * moneda[0].cambio,
          monto_haber: 0,
          monto_haber_alt: 0,
          glosa: "Compra de mercaderías",
          numero: "1",
          usuario_id: auth.user?.id as number,
        });
        //Credito Fiscal
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.credito_fiscal_id,
          monto_debe: total * porcentaje_credito_fiscal,
          monto_debe_alt: (total * porcentaje_credito_fiscal) * moneda[0].cambio,
          monto_haber: 0,
          monto_haber_alt: 0,
          glosa: "Compra de mercaderías",
          numero: "2",
          usuario_id: auth.user?.id as number,
        });
        //caja
        comprobante.related('comprobante_detalles').create({
          cuenta_id: integracion.caja_id,
          monto_haber: total,
          monto_haber_alt: (total) * moneda[0].cambio,
          monto_debe: 0,
          monto_debe_alt: 0,
          glosa: "Compra de mercaderías",
          numero: "3",
          usuario_id: auth.user?.id as number,
        });

      }

      const notaCreada = await empresa.useTransaction(trx).related('notas')
        .create({
          //nro_nota[0].$extras['max']
          nro_nota: (nro_nota[0].$extras['max'] ?? 0) + 1,
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
        const loteCreado = await notaCreada.useTransaction(trx).related('lotes').create({
          estado: 'activo',
          cantidad: lote.cantidad,
          precio_compra: lote.precio,
          fecha_vencimiento: lote.fecha_vencimiento ? (DateTime.fromJSDate(new Date(lote.fecha_vencimiento))) : null,
          articulo_id: lote.articulo_id,
          //nro_nota[0].$extras['max']
          nro_lote: (nro_lote_articulo[0].$extras['max'] ?? 0) + 1,
          stock: lote.cantidad,
          fecha_ingreso: DateTime.fromJSDate(new Date(data.fecha)),
        });
        console.log(loteCreado);
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
  public async anular_venta({ request, response, auth }: HttpContextContract) {
    const data = request.only(['id', 'empresa_id']);
    const empresa = await auth.user?.related('empresas').query().where('id', data.empresa_id).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const nota = await empresa.related('notas').query().preload('detalles').where('id', data.id).first();
    if (!nota) {
      return response.status(400).json({ message: 'La nota no existe' });
    }
    if (nota.estado == 'anulado') {
      return response.status(400).json({ message: 'La nota ya está anulada' });
    }
    const trx = await Database.transaction();
    try {
      if (nota.comprobante_id) {
        //Anulamos el comprobante
        const comprobante = (await Comprobante.findOrFail(nota.comprobante_id)).useTransaction(trx);
        comprobante.estado = 'Anulado';
        comprobante.save();
      }
      await Promise.all(nota.detalles.map(async (detalle) => {
        //Actualizar stock del lote
        const lote = await Lote.query().useTransaction(trx).where('id', detalle.lote_id).first();
        if (!lote) {
          throw new Error('El lote no existe');
        }
        lote.stock = lote.stock + detalle.cantidad;
        lote.save();
        //Actualizar stock del articulo
        const articulo = await empresa.related('articulos').query().where('id', lote.articulo_id).first();
        if (!articulo) {
          throw new Error('El artículo no existe');
        }
        articulo.stock = articulo.stock + detalle.cantidad;
        articulo.save();
      }));
      nota.estado = 'anulado';
      nota.save();
      await trx.commit();
      return response.status(200).json({ message: 'Nota anulada' });
    }
    catch (error) {
      await trx.rollback();
      return response.status(400).json({ message: 'No se pudo anular la nota ' + error.message });
    }
  }
  public async anular_compra({ request, response, auth }: HttpContextContract) {
    //Cuando se anule una nota se deben anular todos los lotes que contenía la nota.
    const data = request.only(['id', 'empresa_id']);
    const empresa = await auth.user?.related('empresas').query().where('id', data.empresa_id).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const nota = await empresa.related('notas').query().preload('lotes').where('id', data.id).first();
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
