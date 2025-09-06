import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Chat } from './chat/chat';
import { GameBoard } from './game-board/game-board';
import { WaitingArea } from './waiting-area/waiting-area';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'chat', component: Chat },
  { path: 'game', component: GameBoard },
  { path: 'waiting/:roomId', component: WaitingArea },
  { path: '**', redirectTo: '/home' }, // Wildcard route for 404 pages
];
