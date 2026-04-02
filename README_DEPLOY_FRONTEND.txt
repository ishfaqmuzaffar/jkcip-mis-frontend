JKCIP MIS FRONTEND DEPLOY NOTES

1) Set build arg in Coolify:
API_BASE_URL=http://72.60.28.22:3002/api

2) This frontend is aligned to these backend modules:
- dashboard
- schemes
- projects
- beneficiaries
- approvals
- users
- profile
- control room overview

3) If you still see an old Flutter UI after deploy:
- open the site in an incognito window
- hard refresh with Ctrl+F5
- clear site data / unregister the service worker in browser dev tools

4) Login roles supported by UI:
- SUPER_ADMIN
- ADMIN
- DEPARTMENT_OFFICER
- DATA_ENTRY
- VIEWER
