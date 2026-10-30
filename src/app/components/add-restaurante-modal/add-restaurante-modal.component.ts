import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ModalController, ToastController,
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonInput, IonSelect, IonSelectOption, IonNote
} from '@ionic/angular/standalone';
import { RestauranteService } from '../../services/restaurante.service';
import { Restaurante } from '../../interface/restaurante';

@Component({
  selector: 'app-add-restaurante-modal',
  templateUrl: './add-restaurante-modal.component.html',
  styleUrls: ['./add-restaurante-modal.component.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
    IonList, IonItem, IonInput, IonSelect, IonSelectOption, IonNote
  ],
})
export class AddRestauranteModalComponent {

  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private restauranteService = inject(RestauranteService);

  guardando = signal(false);

  territorios = ['Araba/Álava', 'Bizkaia', 'Gipuzkoa'];

  // H5: validaciones para no guardar restaurantes sin nombre/territorio o con valores fuera de rango
  form: FormGroup = this.fb.group({
    documentName: ['', Validators.required],
    territory: ['', Validators.required],
    locality: [''],
    address: [''],
    phone: [''],
    web: [''],
    michelinStar: [0, [Validators.min(0), Validators.max(3)]],
    repsolSun: [0, [Validators.min(0), Validators.max(3)]],
  });

  get documentName() { return this.form.get('documentName')!; }
  get territory() { return this.form.get('territory')!; }
  get michelinStar() { return this.form.get('michelinStar')!; }
  get repsolSun() { return this.form.get('repsolSun')!; }

  // H3: salir del modal sin guardar nada
  cancelar() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  async guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { documentName, territory, locality, address, phone, web, michelinStar, repsolSun } = this.form.value;

    const nuevo = {
      documentName: documentName.trim(),
      territory: territory,
      locality: locality?.trim() ?? '',
      address: address?.trim() ?? '',
      phone: phone?.trim() ?? '',
      web: web?.trim() ?? '',
      michelinStar: String(michelinStar ?? 0),
      repsolSun: String(repsolSun ?? 0),
    } as Restaurante;

    this.guardando.set(true);
    try {
      await this.restauranteService.add(nuevo);
      this.modalCtrl.dismiss(null, 'confirm');
    } catch (error) {
      console.error('Error al añadir el restaurante:', error);
      // H9: avisamos de que no se ha guardado para que pueda intentarlo otra vez
      const toast = await this.toastCtrl.create({
        message: 'No se ha podido guardar el restaurante. Revisa tu conexión.',
        duration: 0,
        color: 'danger',
        position: 'bottom',
        buttons: [{ text: 'X', role: 'cancel' }]
      });
      await toast.present();
    } finally {
      this.guardando.set(false);
    }
  }
}
