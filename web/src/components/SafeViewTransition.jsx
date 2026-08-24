import React, { ViewTransition } from 'react';

export function SafeViewTransition({ children, ...props }) {
  if (!ViewTransition) {
    return <>{children}</>;
  }

  return <ViewTransition {...props}>{children}</ViewTransition>;
}

export default SafeViewTransition;
