# Future Upgrades for PathSix CRM

- [ ] Hook into 404 page and log unknown routes to database once backend is ready
    // Example future code to log 404s:
    // fetch("/api/log-404", { method: "POST", body: JSON.stringify({ path: window.location.pathname }), headers: { "Content-Type": "application/json" } }).catch((error) => { console.error("Failed to log 404:", error); });
    // for Quart:
    //@app.route("/api/log-404", methods=["POST"])
    //    async def log_404():
    //        data = await request.get_json()
    //        path = data.get("path")
    //        # Save `path` to your database
    //        return jsonify({"message": "Logged"}), 200
- [ ] Replace fake isLoggedIn check with real login/auth flow
- [ ] Protect API calls with token authentication (after login)
- [ ] Add basic error boundaries for React app
- [ ] Set logic to prevent duplicates entries into db by multiple users
    - Tip: Add database UNIQUE constraints (example: unique on company name or email)
    - Tip: Before inserting, query first to check if record already exists
    - Tip: Frontend can optionally disable submit button during submission to prevent double-clicks
    - Tip: Use a friendly toast message to tell user that entry already exists
- [ ] Confirm auto-increment IDs are properly handled by the database
    - Tip: Primary key auto-increment (Integer, primary_key=True) protects against duplicate IDs even with high concurrency
- [ ] Store 404s with extra info like timestamp, IP or user agent?
- [ ] Do NOT show ID's externally. It's like a ranking, and we don't need that. So no 1. Company Name. Just use Company Name. 
- [ ] Add client_id (tenant ID) to all main database tables (customers, projects, invoices, etc.)
- [ ] Add client_id to all users (each user belongs to one company/client)
- [ ] On all API queries, always filter by client_id to prevent cross-tenant data access
- [ ] Prevent exposing raw internal IDs (use public UUIDs or safe keys for frontend/API)
- [ ] Verify on every create/update/delete API call that the current user’s client_id matches the record’s client_id
- [ ] Ensure that frontend navigation does not allow switching between clients (lock user to their company’s data only)
- [ ] Future: Add admin/superadmin roles that can cross client boundaries safely if needed
- [ ] Future: Log all unauthorized access attempts for security audits
- [ ] Future: Add cleanup routines to delete all user and record data tied to a client_id when a client is deleted (or do soft deletes)
