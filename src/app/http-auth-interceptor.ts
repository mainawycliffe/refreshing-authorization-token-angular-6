import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class HttpAuthInterceptor implements HttpInterceptor {
  constructor(private injector: Injector, private router: Router) {}

  inflightAuthRequest = null;

  blacklist: object = [
    /(((https?):\/\/|www\.)theinfogrid.com\/auth\/)/,
    'some-other-url-pattern',
    'some-other-pattern'
  ];

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // exempt some paths from authentication
    if (req.headers.get('authExempt') === 'true') {
      return next.handle(req);
    }

    const authService = this.injector.get(AuthService);

    if (!this.inflightAuthRequest) {
      this.inflightAuthRequest = authService.getToken();
    }

    return this.inflightAuthRequest.pipe(
      switchMap((newToken: string) => {
        // unset request inflight
        this.inflightAuthRequest = null;

        // use the newly returned token
        const authReq = req.clone({
          headers: req.headers.set('token', newToken ? newToken : '')
        });

        return next.handle(authReq);
      }),
      catchError(error => {
        // checks if a url is to an admin api or not
        if (error.status === 401) {
          // check if the response is from the token refresh end point
          const isFromRefreshTokenEndpoint = !!error.headers.get(
            'unableToRefreshToken'
          );

          if (isFromRefreshTokenEndpoint) {
            localStorage.clear();
            this.router.navigate(['/sign-page']);
            return throwError(error);
          }

          if (!this.inflightAuthRequest) {
            this.inflightAuthRequest = authService.refreshToken();

            if (!this.inflightAuthRequest) {
              // remove existing tokens
              localStorage.clear();
              this.router.navigate(['/sign-page']);
              return throwError(error);
            }
          }

          return this.inflightAuthRequest.pipe(
            switchMap((newToken: string) => {
              // unset inflight request
              this.inflightAuthRequest = null;

              // clone the original request
              const authReqRepeat = req.clone({
                headers: req.headers.set('token', newToken)
              });

              // resend the request
              return next.handle(authReqRepeat);
            })
          );
        } else {
          return throwError(error);
        }
      })
    );
  }

  blacklistCheckup($url: string): boolean {
    let returnValue = false;

    for (const i of Object.keys(this.blacklist)) {
      if (this.blacklist[i].exec($url) !== null) {
        returnValue = true;
        break;
      }
    }

    return returnValue;
  }
}
