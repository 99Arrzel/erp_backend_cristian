import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, HasMany, belongsTo, column, hasMany } from '@ioc:Adonis/Lucid/Orm';
import Empresa from './Empresa';
import Usuario from './Usuario';
import ComprobanteDetalle from './ComprobanteDetalle';

export default class Cuenta extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public nombre: string;

  @column()
  public codigo: string;

  @column()
  public nivel: number;

  @column()
  public tipo: string;
  @column()
  public empresa_id: number;

  @column()
  public padre_id: number;

  @column()
  public usuario_id: number;

  @belongsTo(() => Usuario, {
    localKey: 'usuario_id',
  })
  public usuario: BelongsTo<typeof Usuario>;

  @belongsTo(() => Empresa, {
    localKey: 'empresa_id',
  })
  public empresa: BelongsTo<typeof Empresa>;

  @belongsTo(() => Cuenta, {
    localKey: 'padre_id',
  })

  public padre: BelongsTo<typeof Cuenta>;

  @hasMany(() => ComprobanteDetalle, {
    foreignKey: 'cuenta_id',
  })
  public comprobante_detalles: HasMany<typeof ComprobanteDetalle>;



  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
