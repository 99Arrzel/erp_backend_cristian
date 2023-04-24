import { DateTime } from 'luxon';
import { BaseModel, beforeSave, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm';
import Empresa from './Empresa';
import Gestion from './Gestion';
import Periodo from './Periodo';
import Hash from '@ioc:Adonis/Core/Hash';
import Comprobante from './Comprobante';
import ComprobanteDetalle from './ComprobanteDetalle';

//import { Encryption } from '@adonisjs/core/build/standalone'; //standalone

export default class Usuario extends BaseModel {
  @column({ isPrimary: true })
  public id: number;
  @column()
  public nombre: string;
  @column()
  public usuario: string;
  @column({ serializeAs: null }) //No se serializa, no se envía al cliente
  public password: string;
  @column()
  public tipo: string; //Debería ser un enum

  @hasMany(() => Gestion, {
    foreignKey: 'usuario_id',
  })
  public gestions: HasMany<typeof Gestion>;
  @hasMany(() => Periodo, {
    foreignKey: 'usuario_id',
  })
  public periodos: HasMany<typeof Periodo>;

  @hasMany(() => Empresa, {
    foreignKey: 'usuario_id',
  })
  public empresas: HasMany<typeof Empresa>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;

  @hasMany(() => Comprobante, {
    foreignKey: 'usuario_id',
  })
  public comprobantes: HasMany<typeof Comprobante>;

  @hasMany(() => ComprobanteDetalle, {
    foreignKey: 'usuario_id',
  })
  public comprobante_detalles: HasMany<typeof ComprobanteDetalle>;


  @beforeSave()
  public static async hashPassword(usuario: Usuario) {
    if (usuario.$dirty.password) {
      usuario.password = await Hash.make(usuario.password);
    }
  }
}
