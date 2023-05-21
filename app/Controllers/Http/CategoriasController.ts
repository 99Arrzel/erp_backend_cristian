import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Empresa from 'App/Models/Empresa';

export default class CategoriasController {
  public async listar({ request, response, auth }: HttpContextContract) {
    const id = request.input('id');
    if (id == null) {
      return response.status(400).json({ message: 'El id de la empresa es requerido' });
    }
    const empresa = await Empresa.query().where('id', id).where('usuario_id', auth.user?.id as number)
      .preload('categorias')
      .first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    return response.status(200).json(empresa.categorias);
  }
  public async crear({ request, response, auth }: HttpContextContract) {
    const data = request.only(['nombre', 'empresa_id', 'descripcion', 'padre_id']);
    const empresa = await Empresa.query().where('id', data.empresa_id).where('usuario_id', auth.user?.id as number).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    //Check nombre único
    const categoriaExists = await empresa.related('categorias').query().where('nombre', data.nombre).first();
    if (categoriaExists) {
      return response.status(400).json({ message: 'Ya existe una categoría con el mismo nombre' });
    }
    const categoria = await empresa.related('categorias').create({ nombre: data.nombre, descripcion: data.descripcion, usuario_id: auth.user?.id as number, categoria_id: data.padre_id });
    return response.status(200).json(categoria);
  }
  public async actualizar({ request, response, auth }: HttpContextContract) {
    const data = request.only(['id', 'nombre', 'empresa_id', 'descripcion']);
    const empresa = await Empresa.query().where('id', data.empresa_id).where('usuario_id', auth.user?.id as number).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const categoria = await empresa.related('categorias').query().where('id', data.id).first();
    if (!categoria) {
      return response.status(400).json({ message: 'La categoría no existe' });
    }
    categoria.nombre = data.nombre;
    categoria.descripcion = data.descripcion;
    categoria.save();
    return response.status(200).json(categoria);
  }
  public async eliminar({ request, response, auth }: HttpContextContract) {
    const data = request.only(['id', 'empresa_id']);
    const empresa = await Empresa.query().where('id', data.empresa_id).where('usuario_id', auth.user?.id as number).first();
    if (!empresa) {
      return response.status(400).json({ message: 'La empresa no existe' });
    }
    const categoria = await empresa.related('categorias').query().where('id', data.id).first();
    if (!categoria) {
      return response.status(400).json({ message: 'La categoría no existe' });
    }
    await categoria.delete();
    return response.status(200).json({ message: 'Categoría eliminada' });
  }

}

