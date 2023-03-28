import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Periodo from 'App/Models/Periodo';
import { schema } from '@ioc:Adonis/Core/Validator';
import Gestion from 'App/Models/Gestion';
export default class PeriodosController {
  public async upsert({ request, response, auth }: HttpContextContract) {
    const schemaGestion = schema.create({
      nombre: schema.string(),
      fecha_inicio: schema.date(),
      fecha_fin: schema.date(),
      id: schema.number.optional(),
      gestion_id: schema.number(),
    });
    const messages = {
      "nombre.required": "El nombre del periodo es requerido",
      "nombre.string": "El nombre del periodo debe ser un texto",
      "fecha_inicio.required": "La fecha de inicio es requerida",
      "fecha_inicio.date": "La fecha de inicio debe ser una fecha",
      "fecha_fin.required": "La fecha de fin es requerida",
      "fecha_fin.date": "La fecha de fin debe ser una fecha",
      "gestion_id.required": "La gestion es requerida",
      "gestion_id.number": "La gestion debe ser un número",
    };
    await request.validate({ schema: schemaGestion, messages });
    /* Validar que la fecha de inicio seaa má grande que la fecha fin  por almenos un día*/
    let fechaInicio = new Date(request.input("fecha_inicio"));
    fechaInicio.setDate(fechaInicio.getDate() + 1); //1 día
    const fechaFin = new Date(request.input("fecha_fin"));
    if (fechaInicio > fechaFin) {
      return response.status(400).json({ message: "La fecha de inicio debe ser menor que la fecha de fin por al menos un día" });
    }
    /* No puede existir 2 periods con un mismo nombre para la misma gestion */
    const periodo = await Periodo.query().where("nombre", request.input("nombre")).where("gestion_id", request.input("gestion_id")).whereNot('id', request.input("id") || 0).first();
    if (periodo) {
      return response.status(400).json({ message: "Ya existe un periodo con ese nombre" });
    }
    /* No overlap de periodos */
    const iso = Periodo.query().where("gestion_id", request.input("gestion_id"));
    if (request.input("id")) {
      iso.whereNot("id", request.input("id"));
    }
    iso.where((query) => {
      query.whereRaw('? between fecha_inicio AND fecha_fin', [request.input("fecha_inicio")])
        .orWhereRaw('? between fecha_inicio AND fecha_fin', [request.input("fecha_fin")])
        .orWhere((query) => {
          query.where("fecha_inicio", ">=", request.input("fecha_inicio")).where("fecha_fin", "<=", request.input("fecha_fin"));
        });
    });


    const overlap = await iso;
    if (overlap.length > 0) {
      return response.status(400).json({ message: `Ya existe un periodo que se superpone con: ${overlap.map((v) => v.nombre).join(",")}` });
    }
    /* Verificar que el periodo esté dentro de los limites de la gestion */
    const gestion = await Gestion.findOrFail(request.input("gestion_id"));
    if (request.input("fecha_inicio") < gestion.fecha_inicio || request.input("fecha_fin") > gestion.fecha_fin) {
      return response.status(400).json({ message: "El periodo debe estar dentro de los limites de la gestión" });
    }
    if (request.input("id")) {
      const periodo = await Periodo.findOrFail(request.input("id"));
      /* Si el estado es false entonces no se puede */
      if (!periodo.estado) {
        return response.status(400).json({ message: "No se puede editar un periodo cerrado" });
      }
      periodo.merge(request.only(["nombre", "fecha_inicio", "fecha_fin"]));
      await periodo.save();
      return response.json(periodo);
    }
    const nPer = await Periodo.create({
      nombre: request.input("nombre"),
      fecha_inicio: request.input("fecha_inicio"),
      fecha_fin: request.input("fecha_fin"),
      gestion_id: request.input("gestion_id"),
      usuario_id: auth.user?.id as number,
    });
    return response.json(nPer);
  }
  public async cerrar({ request, response }: HttpContextContract) {
    const periodo = await Periodo.findOrFail(request.input("id"));
    periodo.estado = false;
    await periodo.save();
    return response.json(periodo);
  }
  public async eliminar({ request, response }: HttpContextContract) {
    const periodo = await Periodo.findOrFail(request.input("id"));
    if (!periodo.estado) {
      return response.status(400).json({ message: "No se puede eliminar un periodo cerrado" });
    }
    periodo.delete();
    return response.json(periodo);
  }


}
