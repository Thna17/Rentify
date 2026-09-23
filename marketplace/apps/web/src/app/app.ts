import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CartService } from './core/cart/cart.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = 'KhmerCraft';

  /**
   * Instantiated here so it exists for the whole app lifetime.
   *
   * CartService watches the auth signal and adopts a guest basket the moment
   * someone signs in. Being providedIn:'root' it is still lazily constructed,
   * and the auth pages render no navbar — so on a direct visit to /login the
   * service had never been created, the effect had never registered, and the
   * basket was silently dropped at sign-in.
   */
  private readonly cart = inject(CartService);
}
