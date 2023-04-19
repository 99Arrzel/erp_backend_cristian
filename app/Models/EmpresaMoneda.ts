import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm';
import Usuario from './Usuario';
import Empresa from './Empresa';
import Moneda from './Moneda';

export default class EmpresaMoneda extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public cambio: number;
  @column()
  public activo: boolean;

  @column()
  public moneda_alternativa_id: number | null;

  @belongsTo(() => Moneda, {
    foreignKey: 'moneda_alternativa_id',
  })
  public moneda_alternativa: BelongsTo<typeof Moneda>;
  @column()
  public moneda_principal_id: number;

  @belongsTo(() => Moneda, {
    foreignKey: 'moneda_principal_id',
  })
  public moneda_principal: BelongsTo<typeof Moneda>;



  @column()
  public usuario_id: number;
  @belongsTo(() => Usuario, {
    localKey: 'usuario_id',
  })
  public usuario: BelongsTo<typeof Usuario>;

  @column()
  public empresa_id: number;

  @belongsTo(() => Empresa, {
    localKey: 'empresa_id',
  })
  public empresa: BelongsTo<typeof Empresa>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
