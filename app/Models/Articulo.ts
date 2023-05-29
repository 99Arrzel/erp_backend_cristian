import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, HasMany, ManyToMany, belongsTo, column, hasMany, manyToMany } from '@ioc:Adonis/Lucid/Orm';
import Empresa from './Empresa';
import Usuario from './Usuario';
import Categoria from './Categoria';
import Lote from './Lote';

export default class Articulo extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public nombre: string;
  @column()
  public descripcion: string;
  @column()
  public precio_venta: number;
  @column()
  public stock: number;
  @column()
  public empresa_id: number;
  @column()
  public usuario_id: number;

  @belongsTo(() => Empresa, {
    localKey: 'empresa_id',
  })

  public empresa: BelongsTo<typeof Empresa>;

  @belongsTo(() => Usuario, {
    localKey: 'usuario_id',
  })
  public usuario: BelongsTo<typeof Usuario>;


  //Categorias con tabla intermedia ArticulosCategoria
  @manyToMany(() => Categoria, {
    pivotTable: 'articulos_categorias',

    localKey: 'id',
    pivotForeignKey: 'articulo_id',

    relatedKey: 'id',
    pivotRelatedForeignKey: 'categoria_id',
  })
  public categorias: ManyToMany<typeof Categoria>;


  //lote
  @hasMany(() => Lote, {
    foreignKey: 'articulo_id',
  })

  public lotes: HasMany<typeof Lote>;


  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
