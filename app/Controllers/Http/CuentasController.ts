import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Cuenta from 'App/Models/Cuenta';
import { schema } from '@ioc:Adonis/Core/Validator';
import Empresa from 'App/Models/Empresa';


export async function crearCodigoYNivel({ empresa_id, padre_id }: { empresa_id: number, padre_id: number | null; }) {
  let codigo = "";
  let nivel = 0;
  let empresa = await Empresa.findOrFail(empresa_id);
  const hermanos = await Cuenta.query().where('empresa_id', empresa_id).where("padre_id", padre_id as number);
  if (padre_id) {
    const padre = await Cuenta.findOrFail(padre_id);
    nivel = padre.nivel + 1;
    codigo = padre.codigo;
  }
  if (nivel >= empresa.niveles) {
    throw new Error("No se puede crear una cuenta con más niveles que los permitidos");
  }
  /* Debemos generar el código, que es una secuencia de números separados por puntos #.#.# */
  let maxsize = empresa.niveles;
  /* Llenamos de 0s de acuerdo al tamaño */
  if (codigo == "") {
    for (let i = 0; i < maxsize; i++) {
      codigo += "0";
    }
    codigo = codigo.split("").join(".");
  }
  /* Reemplazamos los 0s por el número de hermanos */
  codigo = codigo.split(".").map((_, index) => {
    if (index == nivel) {
      return hermanos.length + 1;
    }
    return _;
  }).join(".");
  return { codigo, nivel };
}

export default class CuentasController {
  public async listByEmpresa({ request, response }: HttpContextContract) {

    if (!request.param("empresa_id")) {
      return response.status(400).json({ message: "No se ha enviado el id de la empresa" });
    }

    const empresaId = request.param("empresa_id");
    //order by inet aton
    //const cuentas = await Cuenta.query().where("empresa_id", empresaId).orderBy("codigo", "asc");
    const cuentas = await Cuenta.query().where("empresa_id", empresaId).orderByRaw("inet_truchon(codigo)");
    return response.json(cuentas);
  }
  public async upsert({ request, response, auth }: HttpContextContract) {
    const validationSchema = schema.create({
      id: schema.number.optional(),
      nombre: schema.string(),
      empresa_id: schema.number(),
      padre_id: schema.number.optional(),
    });
    await request.validate({
      schema: validationSchema,
    });
    const empresa = await Empresa.findOrFail(request.input("empresa_id"));
    if (request.input("padre_id")) {
      const padre = await Cuenta.findOrFail(request.input("padre_id"));
      if (padre.empresa_id !== empresa.id) {
        return response.status(400).json({ message: "La cuenta padre no pertenece a la empresa" });
      }
    }

    if (request.input("id")) {
      const cuenta = await Cuenta.findOrFail(request.input("id"));
      if (cuenta.empresa_id !== empresa.id) {
        return response.status(400).json({ message: "La cuenta no pertenece a la empresa" });
      }
      cuenta.nombre = request.input("nombre");
      cuenta.save();
      return response.json(cuenta);
    }
    const { codigo, nivel } = await crearCodigoYNivel({ empresa_id: empresa.id, padre_id: request.input("padre_id") });
    const cuenta = await Cuenta.create({
      nombre: request.input("nombre"),
      empresa_id: empresa.id,
      padre_id: request.input("padre_id"),
      nivel: nivel,
      codigo: codigo,
      tipo: (nivel + 1) >= empresa.niveles ? "DETALLE" : "GLOBAL",
      usuario_id: auth.user?.id,
    });
    return response.json(cuenta);
  }
  public async eliminar({ request, response }: HttpContextContract) {
    const cuenta = await Cuenta.findOrFail(request.input("id"));
    //Si cuenta tiene hijos no se puede
    const hijos = await Cuenta.query().where("padre_id", cuenta.id);
    if (hijos.length > 0) {
      return response.status(400).json({ message: "No se puede eliminar una cuenta con hijos" });
    }
    cuenta.delete();
    return response.json(cuenta);
  }
}
