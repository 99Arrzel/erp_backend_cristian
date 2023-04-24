import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm';
import Usuario from './Usuario';
import Gestion from './Gestion';

export default class Periodo extends BaseModel {
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
  public gestion_id: number;
  @column()
  public usuario_id: number;
  @belongsTo(() => Usuario, {
    localKey: 'usuario_id',
  })
  public usuario: BelongsTo<typeof Usuario>;
  @belongsTo(() => Gestion, {
    foreignKey: 'gestion_id',
  })
  public gestion: BelongsTo<typeof Gestion>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
