import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm';
import Empresa from './Empresa';
import Usuario from './Usuario';

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

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
