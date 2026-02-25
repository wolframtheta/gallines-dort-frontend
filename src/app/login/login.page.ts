import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eggOutline, arrowForwardOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { PwaInstallService } from '../services/pwa-install.service';
import { COLORS } from '../models';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class LoginPage {
  readonly COLORS = COLORS;
  isLogin = true;
  email = '';
  password = '';
  displayName = '';
  error = '';
  loading = false;

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly pwa = inject(PwaInstallService);
  private readonly toast = inject(ToastController);

  constructor() {
    addIcons({ eggOutline, arrowForwardOutline });
  }

  async triggerPwaInstall(): Promise<void> {
    if (this.pwa.canInstall()) {
      await this.pwa.install();
    } else {
      const msg =
        this.pwa.installMode() === 'ios'
          ? 'Compartir → Afegir a la pantalla d\'inici'
          : 'Menú del navegador → Afegir a la pantalla d\'inici o Instal·lar';
      const t = await this.toast.create({
        message: msg,
        duration: 4000,
        position: 'bottom',
      });
      await t.present();
    }
  }

  async submit() {
    this.error = '';
    this.loading = true;
    try {
      if (this.isLogin) {
        await this.auth.login(this.email, this.password);
      } else {
        await this.auth.register(
          this.email,
          this.password,
          this.displayName || undefined
        );
      }
      this.router.navigate(['/tabs/dashboard']);
    } catch (e: any) {
      this.error = e?.error?.message || e?.message || 'Error';
    } finally {
      this.loading = false;
    }
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.error = '';
  }
}
