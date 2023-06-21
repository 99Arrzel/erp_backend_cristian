import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, ManyToMany, belongsTo, column, manyToMany } from '@ioc:Adonis/Lucid/Orm';
import Usuario from './Usuario';
import Empresa from './Empresa';
import Articulo from './Articulo';

export default class Categoria extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public nombre: string;
  @column()
  public descripcion: string;
  @column()
  public usuario_id: number;
  @column()
  public empresa_id: number;
  @column()
  public categoria_id: number;

  @belongsTo(() => Usuario, {
    foreignKey: 'usuario_id',
  })
  public usuario: BelongsTo<typeof Usuario>;

  @belongsTo(() => Empresa, {
    foreignKey: 'empresa_id',
  })
  public empresa: BelongsTo<typeof Empresa>;

  @belongsTo(() => Categoria, {
    foreignKey: 'categoria_id',
  })
  public categoria_padre: BelongsTo<typeof Categoria>;

  //Articulos con tabla intermedia ArticulosCategoria
  @manyToMany(() => Articulo, {
    pivotTable: 'articulos_categorias',

    localKey: 'id',
    pivotForeignKey: 'categoria_id',

    relatedKey: 'id',
    pivotRelatedForeignKey: 'articulo_id',
  })
  public articulos: ManyToMany<typeof Articulo>;

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
