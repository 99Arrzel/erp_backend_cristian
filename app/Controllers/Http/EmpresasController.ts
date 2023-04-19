import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext';
import Empresa from 'App/Models/Empresa';
import { schema } from '@ioc:Adonis/Core/Validator';
import EmpresaMoneda from 'App/Models/EmpresaMoneda';
import { crearCodigoYNivel } from './CuentasController';
import Cuenta from 'App/Models/Cuenta';

export default class EmpresasController {
  public async listAll({ response, auth }: HttpContextContract) {
    /* Query empreas by authenticated user id*/
    const empresas = await Empresa.query().where('usuario_id', auth.user?.id as number).where('estado', true).preload('empresa_monedas'); //Empresas activas
    return response.json(empresas);
  }
  public async upsert({ request, response, auth }: HttpContextContract) {
    const loginSchema = schema.create({
      id: schema.number.optional(),
      nombre: schema.string({ trim: true }),
      niveles: schema.number(),
      nit: schema.string(),
      sigla: schema.string(),
      moneda_id: schema.number(),
    });
    await request.validate({
      schema: loginSchema, messages: {
        'nombre.required': 'El nombre de la empresa es requerido',
        'nombre.string': 'El nombre de la empresa debe ser un texto',
        'niveles.required': 'El número de niveles es requerido',
        'niveles.number': 'El número de niveles debe ser un número',
        'nit.required': 'El NIT es requerido',
        'nit.string': 'El NIT debe ser un texto',
        'sigla.required': 'La sigla es requerida',
        'sigla.string': 'La sigla debe ser un texto',
        'telefono.required': 'El teléfono es requerido',
        'telefono.string': 'El teléfono debe ser un texto',
        'correo.required': 'El correo es requerido',
        'correo.string': 'El correo debe ser un texto',
        'direccion.required': 'La dirección es requerida',
        'direccion.string': 'La dirección debe ser un texto',
        'moneda_id.required': 'La moneda es requerida',
      }
    },);
    /* Validamos que no exista uno con el mismo nit o sigla, pero tiene que ser uno con estado */
    if (request.input('id') == null) {
      const test = await Empresa.query().where('estado', true).where((query) => {
        query.where('nit', request.input('nit')).orWhere('sigla', request.input('sigla'));
      }).first();
      if (test) {
        return response.status(400).json({ message: 'Ya existe una empresa con el mismo NIT o sigla' + test.id + "|" + test.nit + "|" + test.sigla + "|" + test.nombre });
      }
    } else {
      const test = await Empresa.query().where('estado', true).where((query) => {
        query.where('nit', request.input('nit')).orWhere('sigla', request.input('sigla'));
      }).whereNot('id', request.input('id')).first();
      if (test) {
        return response.status(400).json({ message: 'Ya existe una empresa con el mismo NIT o sigla' + test.id + "|" + test.nit + "|" + test.sigla + "|" + test.nombre });
      }
    }
    /* Update or create */
    if (request.input('id')) {
      const empresa = await Empresa.findOrFail(request.input('id'));
      if (empresa.usuario_id !== auth.user?.id) {
        return response.status(400).json({ message: 'No tienes permisos para editar esta empresa' });
      }
      empresa.nombre = request.input('nombre');
      empresa.niveles = request.input('niveles');
      empresa.telefono = request.input('telefono');
      empresa.correo = request.input('correo') ?? "";
      empresa.direccion = request.input('direccion') ?? "";
      empresa.nit = request.input('nit') ?? "";
      empresa.sigla = request.input('sigla');
      await empresa.save();

      //Delete all monedas
      await EmpresaMoneda.query().where('empresa_id', empresa.id).delete();
      //Create new moneda
      await EmpresaMoneda.create({
        empresa_id: empresa.id,
        activo: true,
        moneda_principal_id: request.input('moneda_id'),
        usuario_id: auth.user?.id as number,
      });
      return response.json(empresa);
    }
    /* Start transaction */
    const empresa = await Empresa.create({
      nombre: request.input('nombre'),
      niveles: request.input('niveles'),
      telefono: request.input('telefono') ?? "",
      correo: request.input('correo') ?? "",
      direccion: request.input('direccion') ?? "",
      nit: request.input('nit'),
      sigla: request.input('sigla'),
      usuario_id: auth.user?.id as number,
    });
    /* Crear la moneda */
    const empMon = await EmpresaMoneda.create({
      empresa_id: empresa.id,
      activo: true,
      moneda_principal_id: request.input('moneda_id'),
      usuario_id: auth.user?.id as number,
    });
    let { codigo, nivel } = await crearCodigoYNivel({ empresa_id: empresa.id, padre_id: null });
    await Cuenta.create({
      codigo: codigo,
      nombre: 'Activo',
      nivel: nivel,
      empresa_id: empresa.id,
      tipo: 'GLOBAL',
      usuario_id: auth.user?.id as number,
    });
    ({ codigo, nivel } = await crearCodigoYNivel({ empresa_id: empresa.id, padre_id: null }));
    await Cuenta.create({
      codigo: codigo,
      nombre: 'Pasivo',
      nivel: nivel,
      empresa_id: empresa.id,
      tipo: 'GLOBAL',
      usuario_id: auth.user?.id as number,
    });
    ({ codigo, nivel } = await crearCodigoYNivel({ empresa_id: empresa.id, padre_id: null }));
    await Cuenta.create({
      codigo: codigo,
      nombre: 'Patrimonio',
      nivel: nivel,
      empresa_id: empresa.id,
      tipo: 'GLOBAL',
      usuario_id: auth.user?.id as number,
    });
    ({ codigo, nivel } = await crearCodigoYNivel({ empresa_id: empresa.id, padre_id: null }));
    await Cuenta.create({
      codigo: codigo,
      nombre: 'Ingresos',
      nivel: nivel,
      empresa_id: empresa.id,
      tipo: 'GLOBAL',
      usuario_id: auth.user?.id as number,
    });
    ({ codigo, nivel } = await crearCodigoYNivel({ empresa_id: empresa.id, padre_id: null }));
    const egresos = await Cuenta.create({
      codigo: codigo,
      nombre: 'Egresos',
      nivel: nivel,
      empresa_id: empresa.id,
      tipo: 'GLOBAL',
      usuario_id: auth.user?.id as number,
    });
    ({ codigo, nivel } = await crearCodigoYNivel({ empresa_id: empresa.id, padre_id: egresos.id }));
    await Cuenta.create({
      codigo: codigo,
      nombre: 'Costos',
      nivel: nivel,
      empresa_id: empresa.id,
      tipo: 'GLOBAL',
      usuario_id: auth.user?.id as number,
      padre_id: egresos.id,
    });
    ({ codigo, nivel } = await crearCodigoYNivel({ empresa_id: empresa.id, padre_id: egresos.id }));
    await Cuenta.create({
      codigo: codigo,
      nombre: 'Gastos',
      nivel: nivel,
      empresa_id: empresa.id,
      tipo: 'GLOBAL',
      usuario_id: auth.user?.id as number,
      padre_id: egresos.id,
    });

    return response.json(empresa);
  }
  public async delete({ request, response }: HttpContextContract) {
    const empresa = await Empresa.findOrFail(request.input('id'));
    empresa.estado = false;
    await empresa.save();
    return response.json(empresa);
  }
  public async listOne({ auth, request, response }: HttpContextContract) {
    //Encontrar donde estado sea true y el usuario sea el mismo
    //el input está en la url, tipo empresas/12
    const empresa = await Empresa.query().where('id', request.param('id')).where('estado', true).where('usuario_id', auth.user?.id as number)
      .preload('empresa_monedas', (query) => {
        query.preload('moneda_alternativa').preload('moneda_principal').orderBy('id', 'desc');
      })
      .first();
    if (empresa) {
      return response.json(empresa);
    }
    return response.status(400).json({ message: 'No se encontró la empresa' });
  }
}
