import { Component, inject } from '@angular/core';
import { IonContent, IonIcon, IonButton, ViewWillEnter } from '@ionic/angular/standalone';
import { HeaderComponent } from '../components/header/header.component';
import { GallinesService } from '../services/gallines.service';
import { AuthService } from '../services/auth.service';
import { COLORS } from '../models';
import { addIcons } from 'ionicons';
import { personOutline, logOutOutline } from 'ionicons/icons';
import type { User } from '../services/api.service';

@Component({
  selector: 'app-members',
  templateUrl: 'members.page.html',
  styleUrls: ['members.page.scss'],
  imports: [HeaderComponent, IonContent, IonIcon, IonButton],
})
export class MembersPage implements ViewWillEnter {
  readonly COLORS = COLORS;
  private readonly auth = inject(AuthService);

  constructor(public gallines: GallinesService) {
    addIcons({ personOutline, logOutOutline });
  }

  ionViewWillEnter(): void {
    void this.gallines.loadForTab('members');
  }

  get users(): User[] {
    return this.gallines.users$();
  }

  logout(): void {
    void this.auth.logout();
  }
}
