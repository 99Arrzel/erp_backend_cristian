/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'i7 9700i5 9
|
*/
import Route from '@ioc:Adonis/Core/Route';
//Route group called API
Route.group(() => {
  //Basic login and register routes
  Route.group(() => {
    Route.post('/login', 'UsuariosController.login');
    Route.post('/register', 'UsuariosController.register');
    Route.get('/profile', 'UsuariosController.profile').middleware('auth');
    Route.get('/mi_id', 'UsuariosController.id_usuario').middleware('auth');
  }).prefix('/auth');
  //Protected routes
  Route.group(() => {
    Route.group(() => { //Empresas
      Route.get('/listar', 'EmpresasController.listAll'); //By user id
      Route.post('/upsert', 'EmpresasController.upsert');
      Route.post('/delete', 'EmpresasController.delete');
      Route.get('/listar/:id', 'EmpresasController.listOne'); //By empresa id
    }).prefix('/empresas');
    Route.group(() => { //Gestiones
      Route.get('/por_empresa/:id', 'GestionsController.getByEmpresa'); //Listar gestiones por empresa
      Route.post('/upsert', 'GestionsController.upsert');
      Route.post('/eliminar', 'GestionsController.eliminar');
      Route.post('/cerrar', 'GestionsController.cerrar');
      Route.get('/por_id_con_periodos/:gestion_id', 'GestionsController.getByIdWithPeriods'); //Listar gestiones por empresa
    }).prefix('/gestiones');
    Route.group(() => { //Periodos
      Route.post('/upsert/', 'PeriodosController.upsert');
      Route.post('/eliminar', 'PeriodosController.eliminar');
      Route.post('/cerrar', 'PeriodosController.cerrar');
    }).prefix('/periodos');
    Route.group(() => {
      Route.get('/listar_por_empresa/:empresa_id', 'CuentasController.listByEmpresa');
      Route.post('/upsert', 'CuentasController.upsert');
      Route.post('/eliminar', 'CuentasController.eliminar');
    }).prefix('/cuentas');

    Route.group(() => {
      Route.get('/todas', 'MonedaController.listAll');
    }).prefix('/monedas');
    Route.group(() => {
      Route.post('/crear', 'EmpresaMonedasController.register');
    }).prefix('/empresa_moneda');
    Route.group(() => {
      Route.post('/crear', 'ComprobantesController.crearComprobante');
      Route.get('/cerrar/:id', 'ComprobantesController.cerrarComprobante');
      Route.get('/anular/:id', 'ComprobantesController.anularComprobante');
    }).prefix('/comprobante');
    Route.group(() => {
      Route.post('/un_comprobante', 'ComprobantesController.unComprobante');
      Route.post('/balance_inicial', 'ComprobantesController.ComprobanteAperturaGestion');
      Route.post('/libro_diario', 'ComprobantesController.ComprobanteLibroDiario');
      Route.post('/libro_mayor', 'ComprobantesController.ComprobanteLibroMayor');
      Route.post('/sumas_saldos', 'ComprobantesController.comprobacionSumasYSaldos');
      //tercer parcial
      Route.post('/nota_compra', 'ReportesTercerParcialsController.nota_compra');
      Route.post('/nota_venta', 'ReportesTercerParcialsController.nota_venta');
      Route.post('/balance_general', 'ReportesTercerParcialsController.balance_general');
      Route.post('/estado_resultados', 'ReportesTercerParcialsController.estado_resultados');
      //final reporte_articulos_bajo_stock
      Route.post('/reporte_articulos_bajo_stock', 'ArticulosController.reporte_articulos_bajo_stock');
    }).prefix('/reportes');
    Route.group(() => {
      Route.post('/listar', 'CategoriasController.listar');
      Route.post('/crear', 'CategoriasController.crear');
      Route.post('/actualizar', 'CategoriasController.actualizar');
      Route.post('/eliminar', 'CategoriasController.eliminar');
    }).prefix("/categorias");
    Route.group(() => {
      Route.post('/listar', 'ArticulosController.listar');
      Route.post('/crear', 'ArticulosController.crear');
      Route.post('/actualizar', 'ArticulosController.actualizar');
      Route.post('/eliminar', 'ArticulosController.eliminar');
      Route.post('/listar_con_lotes', 'ArticulosController.lista_articulos_con_lotes');
    }).prefix("/articulos");
    Route.group(() => {
      Route.post('/listar', 'CuentasIntegracionsController.listar');
      Route.post('/integrar', 'CuentasIntegracionsController.setIntegracion');
    }).prefix("/integracion");
    Route.group(() => {
      Route.post('/listar', 'NotasController.lista_notas');
      Route.post('/crear_compra', 'NotasController.crear_compra');
      Route.post('/crear_venta', 'NotasController.crear_venta');
      Route.post('/anular_compra', 'NotasController.anular_compra');
      Route.post('/anular_venta', 'NotasController.anular_venta');
      Route.post('/ultimo_numero', 'NotasController.ultimo_numero');
      Route.post('/una_nota', 'NotasController.una_nota');
      Route.post('/una_nota_venta', 'NotasController.una_nota_venta');
    }).prefix("/notas");





  }).middleware('auth');
}).prefix('/api');

Route.get('/test', 'UsuariosController.no_auth');
Route.get('/', async () => {
  return { hello: 'world' };
});
