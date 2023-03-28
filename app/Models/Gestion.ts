import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column, HasMany, hasMany } from '@ioc:Adonis/Lucid/Orm';
import Usuario from './Usuario';
import Empresa from './Empresa';
import Periodo from './Periodo';

export default class Gestion extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public nombre: string;
  @column()
  public fecha_inicio: DateTime;
  @column()
  public fecha_fin: DateTime;
  @column()
  public estado: boolean;
  @column()
  public empresa_id: number;

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
  @hasMany(() => Periodo, {
    foreignKey: 'gestion_id',
  })
  public periodos: HasMany<typeof Periodo>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
