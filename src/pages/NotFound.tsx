import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at top, hsl(225 30% 12%), hsl(225 30% 5%))' }}>
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold font-serif gold-text">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-amber-400 hover:text-amber-300 font-medium underline transition-colors">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
