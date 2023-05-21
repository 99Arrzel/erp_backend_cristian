
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm';

export default class ArticulosCategoria extends BaseModel {
  @column()
  public articulo_id: number;
  @column()
  public categoria_id: number;


}
