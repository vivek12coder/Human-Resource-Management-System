import { Link } from 'react-router-dom';

const Register = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-3">Registration Disabled</h1>
        <p className="text-slate-400 mb-6">
          User registration is managed by admins only.
        </p>
        <Link
          to="/login"
          className="inline-flex px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium"
        >
          Go to Login
        </Link>
      </div>
    </div>
  );
};

export default Register;
