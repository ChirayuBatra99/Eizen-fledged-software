import { useState } from "react";
import { useAuth } from "../AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={tw.page}>
      <form className={tw.card} onSubmit={onSubmit}>
        <div className={tw.brand}>My clinic</div>
        <h1 className={tw.title}>Clinic desk</h1>
        <p className={tw.sub}>Sign in with your username and password</p>
        <label className={tw.label}>
          Username
          <input
            className={tw.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className={tw.label}>
          Password
          <input
            className={tw.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className={tw.error}>{error}</p> : null}
        <button className={tw.btn} type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

const tw = {
  page: "min-h-screen flex items-center justify-center p-4",
  card: "w-full max-w-md bg-white rounded-2xl shadow-md border-2 border-clinic-200 p-6 sm:p-8 flex flex-col gap-4",
  brand: "font-display text-clinic-700 font-extrabold text-sm tracking-wide uppercase m-0",
  title: "font-display text-3xl font-extrabold text-ink m-0 leading-tight",
  sub: "text-base text-ink-soft m-0 -mt-2 mb-1",
  label: "text-base font-bold text-ink flex flex-col gap-1.5",
  input:
    "rounded-xl border-2 border-clinic-200 px-4 py-3 text-lg text-ink outline-none bg-clinic-50/40 focus:border-clinic-600 focus:bg-white focus:ring-4 focus:ring-clinic-100",
  error: "text-base font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 m-0",
  btn: "mt-1 rounded-xl bg-clinic-700 text-white text-lg font-bold py-3.5 min-h-12 shadow-sm hover:bg-clinic-800 disabled:opacity-50",
};
