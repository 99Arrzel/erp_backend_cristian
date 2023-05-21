import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Empresa from 'App/Models/Empresa';

export default class ArticulosController {

  public async listar({ request, response, auth }: HttpContextContract) {
    const id = request.input('id');
    if (id == null) {
      return response.status(400).json({ message: 'El id de la empresa es requerido' });
    }
    const empresa = await Empresa.query().where('id', id).where('usuario_id', auth.user?.id as number)
      .preload('articulos', (query) => {
        query.preload('categorias');
      })
      .first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    return response.status(200).json(empresa.articulos);
  }

  public async crear({ request, response, auth }: HttpContextContract) {
    //Se requiere nombre, descripcion, precio_venta y un array de ids de las categorias
    const data = request.only(['nombre', 'empresa_id', 'descripcion', 'precio_venta', 'categorias']);
    const empresa = await Empresa.query().where('id', data.empresa_id).where('usuario_id', auth.user?.id as number).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    //Check nombre único
    const articuloExists = await empresa.related('articulos').query().where('nombre', data.nombre).first();
    if (articuloExists) {
      return response.status(400).json({ message: 'Ya existe un artículo con el mismo nombre' });
    }
    const articulo = await empresa.related('articulos').create({ nombre: data.nombre, descripcion: data.descripcion, precio_venta: data.precio_venta, usuario_id: auth.user?.id as number });
    //Asignar categorias
    await articulo.related('categorias').attach(data.categorias);
    /* Cargar las categorias */
    await articulo.load('categorias');
    return response.status(200).json(articulo);
  }

  public async actualizar({ request, response, auth }: HttpContextContract) {
    //Se requiere nombre, descripcion, precio_venta y un array de ids de las categorias, además, el id del articulo
    const data = request.only(['id', 'nombre', 'empresa_id', 'descripcion', 'precio_venta', 'categorias']);
    const empresa = await Empresa.query().where('id', data.empresa_id).where('usuario_id', auth.user?.id as number).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const articulo = await empresa.related('articulos').query().where('id', data.id).first();
    if (!articulo) {
      return response.status(400).json({ message: 'El artículo no existe' });
    }
    const articuloExists = await empresa.related('articulos').query().where('nombre', data.nombre).first();
    if (articuloExists && articuloExists.id !== data.id) {
      return response.status(400).json({ message: 'Ya existe un artículo con el mismo nombre' });
    }
    articulo.nombre = data.nombre;
    articulo.descripcion = data.descripcion;
    articulo.precio_venta = data.precio_venta;
    articulo.save();
    //Asignar categorias
    await articulo.related('categorias').sync(data.categorias);
    /* Cargar las categorias */
    await articulo.load('categorias');
    return response.status(200).json(articulo);
  }

  public async eliminar({ request, response, auth }: HttpContextContract) {
    // Se requiere el id del articulo y el id de la empresa
    const data = request.only(['id', 'empresa_id']);
    const empresa = await Empresa.query().where('id', data.empresa_id).where('usuario_id', auth.user?.id as number).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const articulo = await empresa.related('articulos').query().where('id', data.id).first();
    if (!articulo) {
      return response.status(400).json({ message: 'El artículo no existe' });
    }
    await articulo.delete();
    return response.status(200).json({ message: 'Artículo eliminado' });
  }
}