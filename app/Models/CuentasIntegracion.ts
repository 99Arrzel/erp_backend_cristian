import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm';
import Empresa from './Empresa';
import Cuenta from './Cuenta';

export default class CuentasIntegracion extends BaseModel {
  @column({ isPrimary: true })
  public id: number;

  @column()
  public estado: boolean;

  @column()
  public caja_id: number;
  @column()
  public credito_fiscal_id: number;
  @column()
  public debito_fiscal_id: number;
  @column()
  public compras_id: number;
  @column()
  public ventas_id: number;
  @column()
  public it_id: number;
  @column()
  public it_por_pagar_id: number;
  @column()
  public empresa_id: number;

  //Ahora las relaciones
  //Relacion con empresa
  @belongsTo(() => Empresa, {
    foreignKey: 'empresa_id',
  })
  public empresa: BelongsTo<typeof Empresa>;
  //cuentas
  @belongsTo(() => Cuenta, {
    foreignKey: 'caja_id',
  })
  public caja: BelongsTo<typeof Cuenta>;
  @belongsTo(() => Cuenta, {
    foreignKey: 'credito_fiscal_id',
  })
  public credito_fiscal: BelongsTo<typeof Cuenta>;
  @belongsTo(() => Cuenta, {
    foreignKey: 'debito_fiscal_id',
  })
  public debito_fiscal: BelongsTo<typeof Cuenta>;
  @belongsTo(() => Cuenta, {
    foreignKey: 'compras_id',
  })
  public compras: BelongsTo<typeof Cuenta>;
  @belongsTo(() => Cuenta, {
    foreignKey: 'ventas_id',
  })
  public ventas: BelongsTo<typeof Cuenta>;
  @belongsTo(() => Cuenta, {
    foreignKey: 'it_id',
  })
  public it: BelongsTo<typeof Cuenta>;
  @belongsTo(() => Cuenta, {
    foreignKey: 'it_por_pagar_id',
  })
  public it_por_pagar: BelongsTo<typeof Cuenta>;





  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}
