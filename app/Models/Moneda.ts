import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm';
import Usuario from './Usuario';
import EmpresaMoneda from './EmpresaMoneda';

export default class Moneda extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public nombre: string;
  @column()
  public descripcion: string;
  @column()
  public abreviatura: string;
  @column()
  public usuario_id: number;


  @belongsTo(() => Usuario, {
    localKey: 'usuario_id',
  })
  public usuario: BelongsTo<typeof Usuario>;


  @hasMany(() => EmpresaMoneda, {
    foreignKey: 'moneda_principal_id',
  })
  public moneda_principal: HasMany<typeof EmpresaMoneda>;

  @hasMany(() => EmpresaMoneda, {
    foreignKey: 'moneda_alternativa_id',
  })
  public moneda_alternativa: HasMany<typeof EmpresaMoneda>;



  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
