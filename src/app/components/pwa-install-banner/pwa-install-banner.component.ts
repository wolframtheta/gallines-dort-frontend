import { Component, inject } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, closeOutline, shareOutline } from 'ionicons/icons';
import { PwaInstallService } from '../../services/pwa-install.service';
import { COLORS } from '../../models';

addIcons({ downloadOutline, closeOutline, shareOutline });

@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  templateUrl: './pwa-install-banner.component.html',
  styleUrls: ['./pwa-install-banner.component.scss'],
  imports: [IonButton, IonIcon],
})
export class PwaInstallBannerComponent {
  readonly pwa = inject(PwaInstallService);
  readonly COLORS = COLORS;

  async install(): Promise<void> {
    await this.pwa.install();
  }

  dismiss(): void {
    this.pwa.dismiss();
  }
}
