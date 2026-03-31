import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-solarized-base3 to-solarized-base2 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-solarized-blue rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">HR</span>
          </div>
          <h1 className="text-2xl font-bold text-solarized-base02">HRMS</h1>
          <p className="text-solarized-base01 mt-1">Human Resource Management System</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
