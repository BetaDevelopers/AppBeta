declare module '*.jsx' {
    import React from 'react';
    const component: React.ComponentType<any>;
    export default component;
}

declare module '@/features/math/components/*' {
    import React from 'react';
    const component: React.ComponentType<any>;
    export default component;
}
