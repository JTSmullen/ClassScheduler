import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // localStorage is only available in browser contexts. The interceptor is
  // registered via app.config.ts which is merged into the server config, so
  // this guard prevents a ReferenceError during SSR prerendering.
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  // Clone the request and add the authorization header if token exists
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Pass the cloned request to the next handler
  return next(req);
};