import { DateTime } from 'luxon';
import { BaseModel, BelongsTo, belongsTo, column } from '@ioc:Adonis/Lucid/Orm';
import Usuario from './Usuario';
import Comprobante from './Comprobante';
import Cuenta from './Cuenta';

export default class ComprobanteDetalle extends BaseModel {
  public static table = 'detalle_comprobantes';

  @column({ isPrimary: true })
  public id: number;
  @column()
  public numero: string;
  @column()
  public glosa: string;
  @column()
  public monto_debe: number | null;
  @column()
  public monto_haber: number | null;
  @column()
  public monto_debe_alt: number | null;
  @column()
  public monto_haber_alt: number | null;


  @column()
  public usuario_id: number;

  @column()
  public comprobante_id: number;

  @column()
  public cuenta_id: number;

  /* Relaciones */
  @belongsTo(() => Usuario, {
    localKey: 'usuario_id',
  })
  public usuario: BelongsTo<typeof Usuario>;

  @belongsTo(() => Comprobante, {
    localKey: 'comprobante_id',
  })
  public comprobante: BelongsTo<typeof Comprobante>;

  @belongsTo(() => Cuenta, {
    localKey: 'cuenta_id',
  })
  public moneda: BelongsTo<typeof Cuenta>;




  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime;
}