import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-solarized-base3">
      <div className="text-center">
        <ShieldX className="h-16 w-16 text-solarized-red mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-solarized-base02 mb-2">Access Denied</h1>
        <p className="text-solarized-base01 mb-6">
          You don't have permission to access this page.
        </p>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
