# Clinic desk

Small clinic software for the front desk and the doctor. Reception types in the paper slip: patient, medicines, cash or UPI. Save writes the visit and takes that qty off stock. Doctor looks up past visits by phone and checks the day (cash vs UPI, stock sold vs added).

There is also a **draft from note** box on the visit screen. Type something like `Ramesh 9876543210 fever, 10 paracetamol and ORS, UPI` and it fills the form. That goes through a LangGraph flow in `backend/ai_library/`:

1. **intake** — pull name, phone, meds, payment out of the text  
2. **identity** — match or create the patient  
3. **memory** + **formulary** in parallel — past visits, and match medicine names to stock  
4. **billing** — totals, stock checks, whether it is ready to save  

You still review the form and hit Save yourself.

Roles:

- **Receptionist** — new visit, patients, visit history, add stock  
- **Doctor** — patient history, day report, stock  

---

## Run it

You need Python 3, Node, and Postgres (Neon is fine). Two terminals.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill DATABASE_URL, JWT_SECRET, XAI_API_KEY
python migrate.py           # applies schema.sql
uvicorn main:app --port 4000              # http://localhost:4000
```

`XAI_API_KEY` is only needed for draft-from-note. The rest of the desk works without it.

### Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Vite proxies `/auth`, `/patients`, `/medicines`, `/visits`, `/reports`, and `/ai` to the API on port 4000.

Log in with a `doctor` or `receptionist` user from your database.
