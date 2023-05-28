import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, HasMany, belongsTo, column, hasMany } from '@ioc:Adonis/Lucid/Orm';
import Empresa from './Empresa';
import Usuario from './Usuario';
import Comprobante from './Comprobante';
import Lote from './Lote';

export default class Nota extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public nro_nota: number;

  @column()
  public fecha: DateTime;

  @column()
  public descripcion: string;

  @column()

  public empresa_id: number;

  @column()

  public usuario_id: number;

  @column()

  public comprobante_id: number | null;

  @column()
  public tipo: 'compra' | 'venta';

  @column()
  public estado: 'activo' | 'anulado';

  @column()

  public total: number;

  //Relaciones
  //Relacion con empresa
  @belongsTo(() => Empresa, {
    localKey: 'empresa_id',
  })
  public empresa: BelongsTo<typeof Empresa>;

  //Relacion con usuario
  @belongsTo(() => Usuario, {
    localKey: 'usuario_id',
  })
  public usuario: BelongsTo<typeof Usuario>;

  //Relacion con comprobante
  @belongsTo(() => Comprobante, {
    localKey: 'comprobante_id',
  })
  public comprobante: BelongsTo<typeof Comprobante>;
  //Lotes
  @hasMany(() => Lote, {
    foreignKey: 'nota_id',
  })
  public lotes: HasMany<typeof Lote>;











  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
