import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eggOutline, arrowForwardOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
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

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {
    addIcons({ eggOutline, arrowForwardOutline });
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
