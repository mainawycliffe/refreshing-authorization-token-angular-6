import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { share, map } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient, private decoder: JwtHelperService) {}

  refreshToken(): Observable<string> {
    const url = 'url to refresh token here';

    // append refresh token if you have one
    const refreshToken = localStorage.getItem('refreshToken');
    const expiredToken = localStorage.getItem('token');

    return this.http
      .get(url, {
        headers: new HttpHeaders()
          .set('refreshToken', refreshToken)
          .set('token', expiredToken),
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

  getToken(): Observable<string> {
    const token = localStorage.getItem('token');
    const isTokenExpired = this.decoder.isTokenExpired(token);

    if (!isTokenExpired) {
      return of(token);
    }

    return this.refreshToken();
  }

  // other auth methods
}
