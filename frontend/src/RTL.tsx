import { useEffect } from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';

// Create RTL cache
const cacheRtl = createCache({
    key: 'muirtl',
    stylisPlugins: [prefixer, rtlPlugin],
});

export function RTL({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        document.dir = 'rtl';
    }, []);

    return <CacheProvider value={cacheRtl}>{children}</CacheProvider>;
}
