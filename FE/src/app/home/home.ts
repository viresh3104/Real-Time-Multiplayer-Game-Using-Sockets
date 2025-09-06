import { Component, OnInit } from '@angular/core';
import { Home as HomeService } from '../service/home';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  constructor(private Hservice: HomeService, private router: Router) {}

  ngOnInit(): void {
    this.Hservice.OnRoomCreated().subscribe((data) => {
      this.router.navigate([`/waiting/${data.roomToken}`]);
    });

    this.Hservice.onRoomJoined().subscribe((data) => {
      this.router.navigate([`/waiting/${data.roomToken}`]);
    });
  }

  startGame(): void {
    this.Hservice.createRoom().subscribe({
      next: (response) => {
        console.log('Room created successfully:', response);
      },
      error: (err) => {
        console.error('Error creating room:', err);
      },
    });
  }

  JoinGame(roomTokenInput: HTMLInputElement): void {
    const roomToken = roomTokenInput.value.trim();
    this.Hservice.joinRoom(roomToken).subscribe({
      next: (response) => {
        console.log('Joined room successfully:', response);
      },
      error: (err) => {
        console.error('Error joining room:', err);
      },
    });
  }
}
