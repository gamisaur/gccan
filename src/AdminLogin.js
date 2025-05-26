import { useState } from "react";
import { getAuth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";

export default function AdminLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const auth = getAuth();
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      let loginEmail = email.trim();
      if (loginEmail && !loginEmail.includes("@")) {
        loginEmail = `${loginEmail}@gordoncollege.edu.ph`;
      }
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
      onLogin(userCredential.user);
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-100 px-2">
      <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg w-full max-w-xs sm:max-w-md">
        <div className="flex justify-center mb-4 flex-col items-center sm:flex-row sm:items-center">
          <img
            src="/GC logo.png"
            alt="GCCAN Logo"
            className="h-16 w-16 object-contain mb-2 sm:mb-0 sm:mr-2"
            style={{ borderRadius: "8px" }}
          />
          <span className="text-green-600 font-extrabold text-3xl self-center text-center sm:text-left">GCCAN</span>
        </div>
        <h2 className="text-2xl font-bold mb-4 text-center">Admin Login</h2>

        <form
          onSubmit={e => {
            e.preventDefault();
            handleLogin();
          }}
        >
          <label htmlFor="email" className="block mb-1 font-medium">
            Email or UID
          </label>
          <input
            id="email"
            type="text"
            autoFocus
            placeholder="Email or UID (e.g. 202312250)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-green-400 ${
              error ? "border-red-400" : "border-gray-300"
            }`}
          />

          <label htmlFor="password" className="block mb-1 font-medium">
            Password
          </label>
          <div className="relative mb-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full p-2 border rounded pr-10 focus:outline-none focus:ring-2 focus:ring-green-400 ${
                error ? "border-red-400" : "border-gray-300"
              }`}
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-2 flex items-center text-gray-400"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.94 17.94A10.06 10.06 0 0112 19c-5.52 0-10-4.48-10-7s4.48-7 10-7c2.03 0 3.93.61 5.5 1.66M1 1l22 22"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.53 9.53A3.5 3.5 0 0012 15.5c.96 0 1.84-.36 2.53-.95"
                  />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7z"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth={2}
                    fill="none"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="text-xs text-gray-500 mb-3 ml-1">
            Password must be at least 6 characters.
          </div>

          <div className="flex items-center mb-4">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
              className="mr-2"
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-700">
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-green-500 text-white py-2 rounded hover:bg-green-600 transition ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              "Login"
            )}
          </button>
          {error && (
            <p className="text-red-500 text-center mt-2 animate-pulse">{error}</p>
          )}

          <button
            type="button"
            onClick={onBack}
            className="mt-4 w-full bg-gray-400 text-white py-2 rounded hover:bg-gray-500 transition"
          >
            Home
          </button>
        </form>
      </div>
    </div>
  );
}
