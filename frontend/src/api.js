async function request(path, options = {}) {
    const res = await fetch(path, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  }
  
  export const api = {
    logout: () => request("/auth/logout", { method: "POST" }),
    me: () => request("/auth/me"),
    login: (username, password) =>
      request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),

    allPatients: () => request("/patients/all_patients"),
    patientByPhone: (phone) => request(`/patients?phone=${encodeURIComponent(phone)}`),
    patientVisits: (id) => request(`/patients/${id}/visits`),

    medicines: () => request("/medicines"),
    createMedicine: (body) =>  request("/medicines", { method: "POST", body: JSON.stringify(body) }),
    restock: (id, qty, note) =>
      request(`/medicines/${id}/restock`, {
        method: "POST",
        body: JSON.stringify({ qty, note }),
      }),

    visits: () => request("/visits"),
    saveVisit: (body) =>  request("/visits", { method: "POST", body: JSON.stringify(body) }),

    dailyReport: (date) =>  request(`/reports/daily${date ? `?date=${date}` : ""}`),
  };
  