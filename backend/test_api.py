import urllib.request
import json

# Login first
login_url = "http://localhost:8000/api/v1/auth/login"
data = "username=employee@example.com&password=password123".encode('utf-8')
req = urllib.request.Request(login_url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})

try:
    res = urllib.request.urlopen(req)
    token = json.loads(res.read())["access_token"]
    print("Logged in!")
except Exception as e:
    print("Login failed:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
    exit()

# Apply leave
apply_url = "http://localhost:8000/api/v1/employee/leave/apply"
apply_data = json.dumps({
    "leave_type_id": 1,
    "start_date": "2026-10-01",
    "end_date": "2026-10-01",
    "half_day": False,
    "reason": "Test"
}).encode('utf-8')
apply_req = urllib.request.Request(apply_url, data=apply_data, headers={
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
})

try:
    res = urllib.request.urlopen(apply_req)
    print("Status:", res.status)
    print("Response:", res.read().decode())
except urllib.error.HTTPError as e:
    print("Status:", e.code)
    print("Response:", e.read().decode())
