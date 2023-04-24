import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, HasMany, belongsTo, column, hasMany } from '@ioc:Adonis/Lucid/Orm';
import Empresa from './Empresa';
import Usuario from './Usuario';
import Moneda from './Moneda';
import ComprobanteDetalle from './ComprobanteDetalle';

export type Estado = 'Abierto' | 'Cerrado' | 'Anulado';
export type TipoComprobante = 'Ingreso' | 'Egreso' | 'Traspaso' | 'Apertura' | 'Ajuste';

export default class Comprobante extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public serie: string;
  @column()
  public glosa: string;
  @column()
  public fecha: DateTime;
  @column()
  public tc: number;
  @column()
  public estado: Estado;
  @column()
  public tipo: TipoComprobante;
  @column()
  public empresa_id: number;
  @column()
  public usuario_id: number;
  @column()
  public moneda_id: number;

  /* Relaciones */
  @belongsTo(() => Empresa, {
    foreignKey: 'empresa_id',
  })
  public empresa: BelongsTo<typeof Empresa>;

  @belongsTo(() => Usuario, {
    foreignKey: 'usuario_id',
  })
  public usuario: BelongsTo<typeof Usuario>;

  @belongsTo(() => Moneda, {
    foreignKey: 'moneda_id',
  })
  public moneda: BelongsTo<typeof Moneda>;

  @hasMany(() => ComprobanteDetalle, {
    foreignKey: 'comprobante_id',
  })
  public comprobante_detalles: HasMany<typeof ComprobanteDetalle>;





  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
