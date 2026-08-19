import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopBarProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 12;
      });
    }, 80);

    const timer = setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
    }, 350);

    const hide = setTimeout(() => {
      setProgress(0);
    }, 550);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
      clearTimeout(hide);
    };
  }, [location.pathname]);

  if (progress === 0) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[9999] h-[3px] bg-transparent">
      <div
        className="h-full bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
