import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';

import Gestion from "App/Models/Gestion";
import { schema } from '@ioc:Adonis/Core/Validator';
export default class GestionsController {
  public async getByIdWithPeriods({ response, request }: HttpContextContract) {
    const gestions = await Gestion.query().where('id', request.param("gestion_id")).preload("periodos").firstOrFail();
    return response.json(gestions);
  }
  public async getByEmpresa({ request, response }: HttpContextContract) {
    const empresa = await Gestion.query().where(
      "empresa_id",
      request.param("id")
    );
    return response.json(empresa);
  }
  public async upsert({ request, response, auth }: HttpContextContract) {
    /* Validación de los datos de entrada */
    const schemaGestion = schema.create({
      nombre: schema.string(),
      fecha_inicio: schema.date(),
      fecha_fin: schema.date(),
      id: schema.number.optional(),
      empresa_id: schema.number(),
    });
    const messages = {
      "nombre.required": "El nombre de la gestión es requerido",
      "nombre.string": "El nombre de la gestión debe ser un texto",
      "fecha_inicio.required": "La fecha de inicio es requerida",
      "fecha_inicio.date": "La fecha de inicio debe ser una fecha",
      "fecha_fin.required": "La fecha de fin es requerida",
      "fecha_fin.date": "La fecha de fin debe ser una fecha",
      "empresa_id.required": "La empresa es requerida",
      "empresa_id.number": "La empresa debe ser un número",
    };
    await request.validate({ schema: schemaGestion, messages });
    /* Validar que la fecha de inicio seaa má grande que la fecha fin  por almenos un día*/
    let fechaInicio = new Date(request.input("fecha_inicio"));
    fechaInicio.setDate(fechaInicio.getDate() + 1); //1 día
    const fechaFin = new Date(request.input("fecha_fin"));
    if (fechaInicio > fechaFin) {
      return response.status(400).json({ message: "La fecha de inicio debe ser menor que la fecha de fin por al menos un día" });
    }
    //No pueden existir más de 2 gestiones activas por empresa
    const moreThanTwo = await Gestion.query().where("empresa_id", request.input("empresa_id")).where("estado", true);
    if (moreThanTwo.length > 1 && !request.input("id")) { //Empieza en 0
      return response.status(400).json({ message: "No puede haber más de dos gestiones activas por empresa" });
    }
    //No pueden existir dos gestiones con el mismo nombre para la misma empresa
    const sameName = await Gestion.query().where("empresa_id", request.input("empresa_id")).where("nombre", request.input("nombre")).first();
    if (sameName && sameName.id !== request.input("id")) {
      return response.status(400).json({ message: "Ya existe una gestión con el mismo nombre para esta empresa" });
    }
    /* Verificar solapamiento de fecha_inicio y fecha_fin */
    const isO = Gestion.query().where("empresa_id", request.input("empresa_id"));
    if (request.input("id")) {
      isO.whereNot("id", request.input("id"));
    }
    isO.where((query) => {
      query.whereRaw('? between fecha_inicio AND fecha_fin', [request.input("fecha_inicio")])
        .orWhereRaw('? between fecha_inicio AND fecha_fin', [request.input("fecha_fin")])
        .orWhere((query) => {
          query.where("fecha_inicio", ">=", request.input("fecha_inicio")).where("fecha_fin", "<=", request.input("fecha_fin"));
        });
    });
    console.log(isO.toSQL().sql);
    console.log(isO.toQuery());
    const isOverlapping = await isO;
    console.log(isOverlapping);
    if (isOverlapping.length > 0) {
      return response.status(400).json({ message: `La gestión se solapa contra: ${isOverlapping.map((gestion) => gestion.nombre).join(",")}` });
    }
    if (request.input("id")) {
      const gestion = await Gestion.findOrFail(request.input("id"));
      if (!gestion.estado) {
        return response.status(400).json({ message: "No se puede editar una gestión cerrada" });
      }
      const periodos = await gestion.related("periodos").query();
      if (periodos.length > 0) {
        return response.status(400).json({ message: "No se puede editar una gestión que tiene periodos" });
      }
      gestion.nombre = request.input("nombre");
      gestion.fecha_inicio = request.input("fecha_inicio");
      gestion.fecha_fin = request.input("fecha_fin");
      await gestion.save();
      return response.json(gestion);
    }
    const gestion = await Gestion.create({
      nombre: request.input("nombre"),
      fecha_inicio: request.input("fecha_inicio"),
      fecha_fin: request.input("fecha_fin"),
      empresa_id: request.input("empresa_id"),
      usuario_id: auth.user?.id as number,
    });
    return response.json(gestion);
  }
  public async cerrar({ request, response }: HttpContextContract) {
    const gestion = await Gestion.findOrFail(request.input("id"));
    gestion.estado = false;
    await gestion.save();
    return response.json(gestion);
  }
  public async eliminar({ request, response }: HttpContextContract) {
    const gestion = await Gestion.findOrFail(request.input("id"));
    if (!gestion.estado) {
      return response.status(400).json({ message: "No se puede eliminar una gestión cerrada" });
    }
    /* Chequear si periodos existen en gestion */
    const periodos = await gestion.related("periodos").query();
    if (periodos.length > 0) {
      return response.status(400).json({ message: "No se puede eliminar una gestión con periodos" });
    }
    gestion.delete();
    return response.json(gestion);
  }
}
