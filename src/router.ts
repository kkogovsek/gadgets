import { useCallback, useEffect, useState } from 'react';

function getPath() {
  return window.location.pathname;
}

export function useRoute() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const handler = () => setPath(getPath());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const navigate = useCallback((to: string) => {
    history.pushState(null, '', to);
    setPath(to);
  }, []);

  return { path, navigate };
}
