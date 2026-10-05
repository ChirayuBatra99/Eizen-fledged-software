import { NavLink } from "react-router-dom";

import { useAuth } from "../AuthContext";

export function Layout({ children }) {
  const { user, logout } = useAuth();
  const isDesk = user?.role === "receptionist";
  const isDoctor = user?.role === "doctor";

  return (
    <div className={tw.shell}>
      <header className={tw.header}>
        <div className={tw.brandBlock}>
          <div className={tw.brand}>My clinic</div>
          <div className={tw.brandSub}> Clinic desk</div>
        </div>
        <div className={tw.user}>
          <span className={tw.name}>{user?.name}</span>
          <button type="button" className={tw.out} onClick={logout}>
            Logout
          </button>
        </div>
        <nav className={tw.nav}>
          {isDesk ? (
            <>
              <NavLink to="/" className={linkClass} end>
                New visit
              </NavLink>
              <NavLink to="/patients" className={linkClass}>
                Patients
              </NavLink>
              <NavLink to="/history" className={linkClass}>
                Past visits
              </NavLink>
              <NavLink to="/stock" className={linkClass}>
                Add stock
              </NavLink>
            </>
          ) : null}
          {isDoctor ? (
            <>
              <NavLink to="/patients" className={linkClass}>
                Patients
              </NavLink>
              <NavLink to="/" className={linkClass} end>
                Patient history
              </NavLink>
              <NavLink to="/day" className={linkClass}>
                Day report
              </NavLink>
              <NavLink to="/stock" className={linkClass}>
                Medicines
              </NavLink>
            </>
          ) : null}
        </nav>
      </header>
      <main className={tw.main}>{children}</main>
    </div>
  );
}

function linkClass({ isActive }) {
  return isActive ? tw.linkOn : tw.link;
}

const tw = {
  shell: "min-h-screen text-ink",
  header: "bg-white/95 backdrop-blur border-b-2 border-clinic-200 px-3 py-3 sm:px-5 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-3 sm:grid-cols-[auto_1fr_auto] sm:gap-4 shadow-sm",
  brandBlock: "shrink-0 col-start-1 row-start-1 min-w-0",
  brand: "font-display font-extrabold text-lg sm:text-xl text-clinic-800 leading-tight truncate",
  brandSub: "text-xs sm:text-sm font-semibold text-ink-soft mt-0.5",
  nav: "col-span-2 row-start-2 flex justify-start sm:justify-center gap-2 overflow-x-auto min-w-0 pb-0.5 -mx-1 px-1 sm:col-span-1 sm:col-start-2 sm:row-start-1 scrollbar-thin",
  link: "px-3.5 py-2.5 rounded-xl text-[15px] sm:text-base font-semibold text-ink-soft bg-clinic-50 border border-transparent hover:bg-clinic-100 hover:text-clinic-800 whitespace-nowrap shrink-0",
  linkOn: "px-3.5 py-2.5 rounded-xl text-[15px] sm:text-base font-bold bg-clinic-700 text-white border border-clinic-700 whitespace-nowrap shrink-0 shadow-sm",
  user: "flex items-center gap-2 shrink-0 col-start-2 row-start-1 sm:col-start-3",
  name: "text-sm sm:text-base font-semibold text-ink-soft max-w-[7rem] sm:max-w-[12rem] truncate",
  out: "text-sm sm:text-base font-bold border-2 border-clinic-200 rounded-xl px-3 py-2 bg-white text-clinic-800 hover:bg-clinic-50 min-h-10",
  main: "max-w-5xl mx-auto w-full px-3 py-5 sm:px-5 sm:py-6",
};
