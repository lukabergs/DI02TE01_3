import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, addDoc, deleteDoc, doc } from '@angular/fire/firestore';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Restaurante } from '../interface/restaurante';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RestauranteService {

  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private readonly COLECCION = 'restaurantesColeccion';
  private logueado = false;

  // Las reglas de Firestore piden un usuario autenticado, usamos el testUser del environment
  private async login() {
    if (this.logueado) return;
    await signInWithEmailAndPassword(this.auth, environment.testUser.email, environment.testUser.password);
    this.logueado = true;
  }

  async getAll(): Promise<Restaurante[]> {
    await this.login();
    const snapshot = await getDocs(collection(this.firestore, this.COLECCION));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Restaurante));
  }

  async add(restaurante: Restaurante): Promise<void> {
    await this.login();
    await addDoc(collection(this.firestore, this.COLECCION), restaurante);
  }

  async delete(id: string): Promise<void> {
    await this.login();
    await deleteDoc(doc(this.firestore, this.COLECCION, id));
  }

  // Borra todos los documentos de la coleccion (se usa antes de importar el JSON)
  async deleteAll(): Promise<void> {
    const restaurantes = await this.getAll();
    for (const r of restaurantes) {
      await this.delete(r.id!);
    }
  }
}
