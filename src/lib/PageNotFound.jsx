import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);
  return (
    <div className="min-h_screen flex items-center justify-center p6">
      <h2>404 - Page Not Found</h2>
      <button onClick={() => window.location.href = '/'}>Go Home</button>
    </div>
  );
}
