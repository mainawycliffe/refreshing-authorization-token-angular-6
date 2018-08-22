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

    // Get the auth header from the service.
    const token: string = localStorage.getItem('token');

    // Clone the request to add the new header.
    const authReq = req.clone({
      headers: req.headers.set('token', token ? token : '')
    });

    const authService = this.injector.get(AuthService);

    // Pass on the cloned request instead of the original request.
    return next.handle(authReq).pipe(
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
                headers: req.headers.set('', newToken)
              });

              // resend the request
              return next.handle(authReqRepeat);
            })
          );
        } else {
          return throwError(error);
        }
      })
    ) as any;
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
