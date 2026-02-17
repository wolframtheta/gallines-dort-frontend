import { Component, inject, OnInit } from '@angular/core';
import { IonHeader, IonToolbar } from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { GallinesService } from '../../services/gallines.service';
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

  ngOnInit(): void {
    void this.gallines.loadBalance();
  }
}
