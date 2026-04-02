JKCIP MIS FRONTEND DEPLOY NOTES
================================

1. Default API base URL
   http://72.60.28.22:3002/api

2. To point the frontend to another backend during Docker build, set:
   API_BASE_URL=https://your-domain/api

3. Example docker build:
   docker build --build-arg API_BASE_URL=http://72.60.28.22:3002/api -t jkcip-mis-frontend .

4. Coolify note:
   Add build arg named API_BASE_URL if your backend URL changes.

5. Improvements in this updated zip:
   - API base URL is now configurable via build args / dart-define
   - web fallback resolves current browser host automatically when possible
   - API calls now use request timeouts
   - better error handling for 400/401/403/404/500 responses
   - cleaned deployment-ready package
