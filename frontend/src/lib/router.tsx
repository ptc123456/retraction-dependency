import React, {
  AnchorHTMLAttributes,
  MouseEvent,
  ReactElement,
  ReactNode,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type NavigateOptions = {
  replace?: boolean;
};

type Navigate = (to: string, options?: NavigateOptions) => void;

type RouterContextValue = {
  pathname: string;
  navigate: Navigate;
};

const RouterContext = createContext<RouterContextValue | null>(null);
const ParamsContext = createContext<Record<string, string>>({});

const browserPathname = () =>
  typeof window === 'undefined' ? '/' : window.location.pathname;

const useRouter = (): RouterContextValue => {
  const value = useContext(RouterContext);
  if (!value) throw new Error('Router hooks must be used inside BrowserRouter.');
  return value;
};

export const BrowserRouter: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState(browserPathname);

  useEffect(() => {
    const onPopState = () => setPathname(browserPathname());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback<Navigate>((to, options) => {
    const target = new URL(to, window.location.origin);
    const next = `${target.pathname}${target.search}${target.hash}`;
    if (options?.replace) {
      window.history.replaceState(null, '', next);
    } else {
      window.history.pushState(null, '', next);
    }
    setPathname(target.pathname);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } catch {
        // Fallback for environments where scrollTo options are not supported
      }
    }
  }, []);

  const value = useMemo(() => ({ pathname, navigate }), [navigate, pathname]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string;
};

const shouldHandleClientSide = (
  event: MouseEvent<HTMLAnchorElement>,
  target?: string,
) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  (!target || target === '_self');

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, onClick, target, ...rest }, ref) => {
    const { navigate } = useRouter();

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (!event.defaultPrevented && shouldHandleClientSide(event, target)) {
        event.preventDefault();
        navigate(to);
      }
    };

    return (
      <a
        {...rest}
        ref={ref}
        href={to}
        target={target}
        onClick={handleClick}
      />
    );
  },
);

Link.displayName = 'Link';

type NavLinkRenderState = {
  isActive: boolean;
};

type NavLinkProps = Omit<LinkProps, 'className'> & {
  className?: string | ((state: NavLinkRenderState) => string);
  end?: boolean;
};

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, end = false, to, ...rest }, ref) => {
    const { pathname } = useRouter();
    const normalizedTarget = to === '/' ? '/' : to.replace(/\/+$/, '');
    const isActive =
      pathname === normalizedTarget ||
      (!end &&
        normalizedTarget !== '/' &&
        pathname.startsWith(`${normalizedTarget}/`));
    const resolvedClassName =
      typeof className === 'function' ? className({ isActive }) : className;

    return (
      <Link
        {...rest}
        ref={ref}
        to={to}
        className={resolvedClassName}
        aria-current={isActive ? 'page' : undefined}
      />
    );
  },
);

NavLink.displayName = 'NavLink';

type RouteProps = {
  path: string;
  element: ReactElement;
};

export const Route: React.FC<RouteProps> = () => null;

const matchRoute = (
  pattern: string,
  pathname: string,
): Record<string, string> | null => {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];
    if (patternPart.startsWith(':')) {
      try {
        params[patternPart.slice(1)] = decodeURIComponent(pathPart);
      } catch {
        params[patternPart.slice(1)] = pathPart;
      }
    } else if (patternPart !== pathPart) {
      return null;
    }
  }
  return params;
};

export const Routes: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { pathname } = useRouter();

  for (const child of React.Children.toArray(children)) {
    if (!isValidElement<RouteProps>(child)) continue;
    const params = matchRoute(child.props.path, pathname);
    if (params) {
      return (
        <ParamsContext.Provider value={params}>
          {child.props.element}
        </ParamsContext.Provider>
      );
    }
  }

  return null;
};

export const useNavigate = (): Navigate => useRouter().navigate;

export const useParams = <
  T extends Record<string, string | undefined> = Record<string, string>,
>(): T => useContext(ParamsContext) as T;
