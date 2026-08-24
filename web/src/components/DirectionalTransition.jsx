import React from 'react';
import SafeViewTransition from './SafeViewTransition';

export function DirectionalTransition({ children }) {
  return (
    <SafeViewTransition
      enter={{
        'nav-forward': 'nav-forward',
        'nav-back': 'nav-back',
        default: 'none',
      }}
      exit={{
        'nav-forward': 'nav-forward',
        'nav-back': 'nav-back',
        default: 'none',
      }}
      default="none"
    >
      {children}
    </SafeViewTransition>
  );
}

export default DirectionalTransition;
