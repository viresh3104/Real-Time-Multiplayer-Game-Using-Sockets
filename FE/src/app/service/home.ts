import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class Home {
  private baseURl = environment.baseURL;
  private socket: Socket;

  constructor(private http: HttpClient) {
    if (!this.socket || !this.socket.connected) {
      this.socket = io(environment.baseURL.replace('/api', ''), {
        transports: ['websocket'],
        reconnection: true,
      });
    }
  }

  createRoom(): Observable<{ roomToken: string }> {
    const ownerSocketId = this.socket.id;
    return this.http.post<{ roomToken: string }>(`${this.baseURl}/create`, {
      ownerSocketId,
    });
  }

  joinRoom(roomToken: string): Observable<{ success: boolean }> {
    const playerSocketId = this.socket.id;
    return this.http.post<{ success: boolean }>(`${this.baseURl}/join`, {
      playerSocketId,
      roomToken,
    });
  }

  OnRoomCreated(): Observable<{ roomToken: string }> {
    return new Observable((observer) => {
      this.socket.on('roomCreated', (data: { roomToken: string }) => {
        observer.next(data);
      });
    });
  }

  onRoomJoined(): Observable<{
    roomToken: string;
    playerSocketId: string;
    playerColor: string;
  }> {
    return new Observable((observer) => {
      this.socket.on(
        'playerJoined',
        (data: {
          roomToken: string;
          playerSocketId: string;
          playerColor: string;
        }) => {
          observer.next(data);
        }
      );
    });
  }
}
