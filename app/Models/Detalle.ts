import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm';
import Lote from './Lote';
import Nota from './Nota';

export default class Detalle extends BaseModel {
  @column({ isPrimary: true })
  public id: number;
  @column()

  public nota_id: number;
  @column()
  public lote_id: number;

  @column()
  public cantidad: number;
  @column()
  public precio_venta: number;
  @belongsTo(() => Lote, {
    foreignKey: 'lote_id',
  })
  public lote: BelongsTo<typeof Lote>;


  @belongsTo(() => Nota, {
    foreignKey: 'nota_id',
  })
  public nota: BelongsTo<typeof Nota>;
  //relation with articulo

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
