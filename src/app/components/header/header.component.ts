import { Component, inject, OnInit } from '@angular/core';
import { IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { GallinesService } from '../../services/gallines.service';
import { AuthService } from '../../services/auth.service';
import { COLORS } from '../../models';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
  imports: [IonHeader, IonToolbar, DecimalPipe, RouterLink],
})
export class HeaderComponent implements OnInit {
  readonly COLORS = COLORS;
  readonly gallines = inject(GallinesService);
  private readonly auth = inject(AuthService);

  /** El teu balanç: positiu = et deuen, negatiu = deus */
  get myBalance(): number {
    const user = this.auth.user$();
    const settlement = this.gallines.settlement();
    if (!user) return 0;
    const row = settlement.find((r) => r.personId === user.id);
    return row?.diff ?? 0;
  }

  ngOnInit(): void {
    void this.gallines.loadBalance();
  }
}
