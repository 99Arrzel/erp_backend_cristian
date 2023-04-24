import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, HasMany, belongsTo, column, hasMany } from '@ioc:Adonis/Lucid/Orm';

import Usuario from './Usuario';
import EmpresaMoneda from './EmpresaMoneda';
import Comprobante from './Comprobante';
import Cuenta from './Cuenta';
export default class Empresa extends BaseModel {
  @column({ isPrimary: true })
  public id: number;
  @column()
  public nombre: string;
  @column()
  public nit: string;
  @column()
  public sigla: string;
  @column()
  public telefono: string;
  @column()
  public correo: string;
  @column()
  public direccion: string;
  @column()
  public niveles: number;
  @column()
  public estado: boolean;
  @column()
  public usuario_id: number;


  @belongsTo(() => Usuario, {
    localKey: 'usuario_id',
  })

  public usuario: BelongsTo<typeof Usuario>;

  @hasMany(() => EmpresaMoneda, {
    foreignKey: 'empresa_id',
  })
  public empresa_monedas: HasMany<typeof EmpresaMoneda>;

  @hasMany(() => Comprobante, {
    foreignKey: 'empresa_id',
  })
  public comprobantes: HasMany<typeof Comprobante>;
  @hasMany(() => Cuenta, {
    foreignKey: 'empresa_id',
  })
  public cuentas: HasMany<typeof Cuenta>;



  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
