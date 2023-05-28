import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm';
import Articulo from './Articulo';
import Nota from './Nota';

export default class Lote extends BaseModel {
  //@column({ isPrimary: true })
  //The primary are 2 columns
  @column()
  public articulo_id: number;

  @column()
  public nro_lote: string;

  @column()
  public estado: 'activo' | 'anulado';

  @column()
  public fecha_vencimiento: DateTime | null;

  @column()
  public fecha_ingreso: DateTime;

  @column()
  public cantidad: number;
  @column()
  public precio_compra: number;
  @column()
  public stock: number;
  @column()
  public nota_id: number;

  //Relaciones
  //Relacion con articulo
  @belongsTo(() => Articulo, {
    localKey: 'articulo_id',
  })
  public articulo: BelongsTo<typeof Articulo>;

  //Relacion con nota

  @belongsTo(() => Nota, {
    localKey: 'nota_id',
  })
  public nota: BelongsTo<typeof Nota>;


  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
