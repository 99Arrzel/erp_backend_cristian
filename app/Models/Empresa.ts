import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm';
import Usuario from './Usuario';
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
  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
