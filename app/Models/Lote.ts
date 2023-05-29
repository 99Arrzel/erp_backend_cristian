import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, HasMany, belongsTo, column, hasMany } from '@ioc:Adonis/Lucid/Orm';
import Articulo from './Articulo';
import Nota from './Nota';
import Detalle from './Detalle';

export default class Lote extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

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
    foreignKey: 'articulo_id',
  })
  public articulo: BelongsTo<typeof Articulo>;

  //Relacion con nota

  @belongsTo(() => Nota, {
    foreignKey: 'nota_id',
  })
  public nota: BelongsTo<typeof Nota>;

  /*   @hasMany(() => Detalle, {
      foreignKey: 'lote_id',
    }) */
  @hasMany(() => Detalle, {
    foreignKey: 'lote_id',
  })
  public detalles: HasMany<typeof Detalle>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
