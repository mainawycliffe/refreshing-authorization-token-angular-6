# Refreshing Authorization Token - Angular 6

The idea here is to be able to intercept http requests, attach an authorization header to the request. And to intercept http response, check for authentication errors and refresh tokens when necessary, otherwise redirect to the login page.

Once the token has been refreshed successfully, you should resend all intercepted HTTP responses back to their origin, and only return a non auth related error back to the end user. This whole process should occur smoothly without breaking the UX if successful. We should only interrupt the user when action is needed from them – such as log in in this case.

This repo is for a post that was published [here]:<https://theinfogrid.com/tech/developers/angular/refreshing-authorization-tokens-angular-6>
