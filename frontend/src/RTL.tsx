import { useEffect } from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import stylisPluginRtl from '@mui/stylis-plugin-rtl';
import { prefixer } from 'stylis';

const cacheRtl = createCache({
    key: 'muirtl',
    stylisPlugins: [prefixer, stylisPluginRtl],
});

export function RTL({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        document.dir = 'rtl';
    }, []);

    return <CacheProvider value={cacheRtl}>{children}</CacheProvider>;
}
