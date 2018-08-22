import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { share, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  refreshToken(): Observable<string> {
    const url = 'url to refresh token here';

    // append refresh token if you have one
    const refreshToken = localStorage.getItem('refreshToken');

    return this.http
      .get(url, {
        headers: new HttpHeaders().set('refreshToken', refreshToken),
        observe: 'response'
      })
      .pipe(
        share(), // <========== YOU HAVE TO SHARE THIS OBSERVABLE TO AVOID MULTIPLE REQUEST BEING SENT SIMULTANEOUSLY
        map(res => {
          const token = res.headers.get('token');
          const newRefreshToken = res.headers.get('refreshToken');

          // store the new tokens
          localStorage.setItem('refreshToken', newRefreshToken);
          localStorage.setItem('token', token);

          return token;
        })
      );
  }

  // other auth methods
}
