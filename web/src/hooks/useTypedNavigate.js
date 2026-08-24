import { startTransition, addTransitionType } from 'react';
import { useNavigate } from 'react-router-dom';

export function useTypedNavigate() {
  const navigate = useNavigate();

  const navigateForward = (to, options) => {
    if (typeof addTransitionType === 'function') {
      startTransition(() => {
        addTransitionType('nav-forward');
        navigate(to, options);
      });
    } else {
      navigate(to, options);
    }
  };

  const navigateBack = (to, options) => {
    if (typeof addTransitionType === 'function') {
      startTransition(() => {
        addTransitionType('nav-back');
        if (to) {
          navigate(to, options);
        } else {
          navigate(-1);
        }
      });
    } else {
      if (to) {
        navigate(to, options);
      } else {
        navigate(-1);
      }
    }
  };

  return { navigate, navigateForward, navigateBack };
}

export default useTypedNavigate;
