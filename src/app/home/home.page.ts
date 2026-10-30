import { Component, signal, computed, inject } from '@angular/core';
import restaurantesJSON from '../../assets/datos/restaurantes.json';
import {
  ToastController, AlertController, ModalController,
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cloudDownloadOutline, cloudUploadOutline, addCircleOutline, trashOutline } from 'ionicons/icons';
import { Restaurante } from '../interface/restaurante';
import { RestauranteService } from '../services/restaurante.service';
import { AddRestauranteModalComponent } from '../components/add-restaurante-modal/add-restaurante-modal.component';

@Component({
  selector: 'app-home',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonGrid, IonRow, IonCol
  ],
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage {

  constructor() {
    addIcons({ cloudDownloadOutline, cloudUploadOutline, addCircleOutline, trashOutline });
  }

  // ############################### REGION DATOS ###############################

  toastCtrl = inject(ToastController);
  alertCtrl = inject(AlertController);
  modalCtrl = inject(ModalController);
  restauranteService = inject(RestauranteService);

  // Signal principal con los restaurantes cargados desde Firebase (vacío hasta que el usuario pulsa "Cargar")
  restaurantesCargados = signal<Restaurante[]>([]);

  // true mientras se carga la lista desde Firebase
  cargando = signal(false);

  // true durante la importación del JSON
  importando = signal(false);

  // true cuando hay al menos un restaurante cargado
  hayDatos = computed(() => this.restaurantesCargados().length > 0);

  // Lee todos los restaurantes de Firebase y los guarda en el signal
  async cargarDatos() {
    this.cargando.set(true);
    try {
      const datos = await this.restauranteService.getAll();
      this.restaurantesCargados.set(datos);
      this.mostrarToast(`${datos.length} restaurantes cargados`, 'success');
    } catch (error) {
      this.mostrarToast(this.mensajeError(error, 'cargar los datos'), 'danger');
    } finally {
      this.cargando.set(false);
    }
  }

  // H3 y H5: la importación borra todo lo que hay en el servidor, así que se pide confirmación antes
  async confirmarImportacion() {
    const alert = await this.alertCtrl.create({
      header: 'Importar restaurantes',
      subHeader: `Se subirán ${restaurantesJSON.length} restaurantes del archivo JSON`,
      message: 'Se borrarán todos los restaurantes que hay ahora en el servidor. ¿Quieres continuar?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Importar', handler: () => { this.importarJSON(); } }
      ]
    });
    await alert.present();
  }

  // Borra la colección y sube uno a uno los restaurantes del JSON
  async importarJSON() {
    this.importando.set(true);
    try {
      await this.restauranteService.deleteAll();
      for (const r of restaurantesJSON as Restaurante[]) {
        await this.restauranteService.add(r);
      }
      await this.cargarDatos();
    } catch (error) {
      this.mostrarToast(this.mensajeError(error, 'importar los datos'), 'danger');
    } finally {
      this.importando.set(false);
    }
  }

  // Abre el modal para añadir un restaurante y recarga la lista si se ha guardado
  async abrirModalAgregar() {
    const modal = await this.modalCtrl.create({
      component: AddRestauranteModalComponent
    });
    await modal.present();

    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') {
      await this.cargarDatos();
    }
  }

  // H3 y H5: el borrado no se puede deshacer, el usuario tiene que confirmarlo (o cancelar)
  // H2: se usa el nombre real del restaurante en el mensaje
  async confirmarBorrado(r: Restaurante) {
    const alert = await this.alertCtrl.create({
      header: 'Borrar restaurante',
      message: `¿Deseas borrar el restaurante ${r.documentName}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Borrar', role: 'destructive', handler: () => { this.borrarRestaurante(r); } }
      ]
    });
    await alert.present();
  }

  async borrarRestaurante(r: Restaurante) {
    try {
      await this.restauranteService.delete(r.id!);
      // Actualizamos el signal para que la tabla se repinte sin volver a pedir los datos
      this.restaurantesCargados.update(lista => lista.filter(x => x.id !== r.id));
      this.mostrarToast(`${r.documentName} borrado`, 'success');
    } catch (error) {
      this.mostrarToast(this.mensajeError(error, 'borrar el restaurante'), 'danger');
    }
  }

  // H9 y H4: el mismo error da siempre el mismo mensaje, diferenciando permisos de problemas de conexión
  mensajeError(error: any, accion: string): string {
    if (error?.code === 'permission-denied') {
      return 'No tienes permisos en el servidor. Revisa las reglas de seguridad.';
    }
    return `Error al ${accion}. Revisa tu conexión a internet.`;
  }

  // Muestra un toast con el mensaje y color indicados
  // H1: verde cuando la operación ha ido bien
  // H9: los errores no desaparecen solos (duration 0), hay que cerrarlos con la X
  private async mostrarToast(mensaje: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: color === 'success' ? 3000 : 0,
      color,
      position: 'bottom',
      buttons: [{ text: 'X', role: 'cancel' }]
    });
    await toast.present();
  }


  // ############################### REGION FILTROS (estado general) ###############################

  textoBusqueda = signal('');

  // true si hay algún filtro activo (texto, territorio o localidades)
  hayFiltrosActivos = computed(() =>
    !!this.textoBusqueda() ||
    !!this.territorioSeleccionado() ||
    this.localidadesSeleccionadas().length > 0
  );

  // Resetea todos los filtros a sus valores iniciales
  limpiarTodosFiltros() {
    this.textoBusqueda.set('');
    this.territorioSeleccionado.set('');
    this.localidadesSeleccionadas.set([]);
  }

  // ############################### REGION TERRITORIOS ###############################

  territorioSeleccionado = signal('');

  // Lista de territorios únicos disponibles, ordenada alfabéticamente
  territoriosFiltrados = computed(() => {
    const territorios = this.restaurantesCargados().map(r => r.territory);
    return Array.from(new Set(territorios)).sort();
  });

  // Actualiza el territorio seleccionado y elimina las localidades que ya no pertenecen a él
  onTerritorioChange(value: string) {
    this.territorioSeleccionado.set(value);
    const nuevasLocalidades = this.localidadesSeleccionadas().filter(loc =>
      this.localidadesFiltradasPorTerritorio().includes(loc)
    );
    this.localidadesSeleccionadas.set(nuevasLocalidades);
  }

  // ############################### REGION LOCALIDADES ###############################

  localidadesSeleccionadas = signal<string[]>([]);

  // Lista de localidades únicas del territorio seleccionado (o de todos si no hay territorio), ordenada alfabéticamente
  localidadesFiltradasPorTerritorio = computed(() => {
    let lista = this.restaurantesCargados();
    const territorio = this.territorioSeleccionado().toLowerCase().trim();
    if (territorio) {
      lista = lista.filter(r => r.territory?.toLowerCase().trim() === territorio);
    }
    const localities = lista.map(r => r.locality?.trim()).filter((l): l is string => !!l);
    return Array.from(new Set(localities)).sort();
  });

  // Actualiza las localidades seleccionadas con los valores del evento
  onLocalidadesChange(value: string[]) {
    this.localidadesSeleccionadas.set(value);
  }

  // ############################### REGION RESULTADOS ###############################

  // Lista filtrada de restaurantes según todos los filtros activos
  // H7: los tres filtros se pueden combinar para afinar la búsqueda
  restaurantesFiltrados = computed(() => {
    let lista = this.restaurantesCargados();

    const texto = this.textoBusqueda().toLowerCase().trim();
    if (texto) {
      lista = lista.filter(r => r.documentName.toLowerCase().includes(texto));
    }

    const territorio = this.territorioSeleccionado().toLowerCase().trim();
    if (territorio) {
      lista = lista.filter(r => r.territory.toLowerCase().trim() === territorio);
    }

    const seleccionadas = this.localidadesSeleccionadas();
    if (seleccionadas.length > 0) {
      lista = lista.filter(r => seleccionadas.includes(r.locality?.trim() || ''));
    }

    return lista;
  });

  // ############################### REGION AUXILIARES ###############################

  // Devuelve el número de estrellas Michelin (0 si no tiene o el valor no es numérico)
  estrellasMichelin(r: Restaurante): number {
    return Number(r.michelinStar) || 0;
  }

  // Devuelve el número de soles Repsol (0 si no tiene o el valor no es numérico)
  repsolSoles(r: Restaurante): number {
    return Number(r.repsolSun) || 0;
  }
}
