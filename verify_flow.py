import urllib.request
import urllib.parse
import json
import time

BACKEND_URL = "http://localhost:8000"

def safe_print(text):
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode("ascii", "replace").decode("ascii"))

def send_post(path, data, token=None):
    url = f"{BACKEND_URL}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def send_post_form(path, form_data):
    url = f"{BACKEND_URL}{path}"
    req = urllib.request.Request(
        url,
        data=urllib.parse.urlencode(form_data).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST"
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def send_get(path, token=None):
    url = f"{BACKEND_URL}{path}"
    req = urllib.request.Request(url, method="GET")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))

def verify():
    safe_print("[START] Starting Xeno AI CRM End-to-End Verification Flow...")
    
    # 0. Authenticate to obtain JWT token
    safe_print("\n0. Authenticating as admin@xeno.com to obtain JWT Access Token...")
    token = None
    try:
        login_res = send_post_form("/api/v1/auth/token", {
            "username": "admin@xeno.com",
            "password": "password123"
        })
        token = login_res["access_token"]
        safe_print(f"[OK] Authenticated successfully. User: {login_res['user']['username']} (Role: {login_res['user']['role']})")
    except Exception as e:
        safe_print(f"[ERROR] Authentication failed: {e}. Make sure backend is running and seeded.")
        return

    # 1. Seed customer database
    safe_print("\n1. Seeding customer database with shopper intelligence profiles...")
    mock_data = {
        "customers": [
            {
                "email": "chloe.jones@example.com",
                "phone": "+1555019201",
                "first_name": "Chloe",
                "last_name": "Jones",
                "metadata": {"city": "New York", "preferred_category": "Fashion", "loyalty_tier": "VIP"},
                "orders": [
                    {"amount": 180.00, "items": [{"name": "Designer Jacket", "qty": 1, "price": 180.00, "category": "Fashion"}]}
                ]
            },
            {
                "email": "marcus.tucker@example.com",
                "phone": "+1555029302",
                "first_name": "Marcus",
                "last_name": "Tucker",
                "metadata": {"city": "San Francisco", "preferred_category": "Coffee", "loyalty_tier": "VIP"},
                "orders": [
                    {"amount": 120.00, "items": [{"name": "Premium Espresso Blend", "qty": 8, "price": 15.00, "category": "Coffee"}]}
                ]
            },
            {
                "email": "david.miller@example.com",
                "phone": "+1555049504",
                "first_name": "David",
                "last_name": "Miller",
                "metadata": {"city": "Chicago", "preferred_category": "Coffee", "loyalty_tier": "Regular"},
                "orders": [
                    {"amount": 15.00, "items": [{"name": "Single Drip Coffee", "qty": 1, "price": 15.00, "category": "Coffee"}], "order_date": "2026-04-10T12:00:00Z"}
                ]
            }
        ]
    }
    
    try:
        ingest_res = send_post("/api/v1/customers/ingest", mock_data, token=token)
        safe_print(f"[OK] Ingestion response: {ingest_res['message']}")
    except Exception as e:
        safe_print(f"[ERROR] Ingestion failed: {e}")
        return

    # 2. Consult LangGraph Agent Network
    safe_print("\n2. Querying LangGraph Agent Network for a campaign recommendation...")
    prompt = "Target VIP high spending customers, offer them early access to a new collection, and use the best channel."
    safe_print(f"Marketer Prompt: '{prompt}'")
    
    try:
        recommendation = send_post("/api/v1/campaigns/recommend", {"prompt": prompt}, token=token)
        safe_print("[OK] Recommendation received:")
        safe_print(f"   - Target Rules: {json.dumps(recommendation['rules'])}")
        safe_print(f"   - Recommended Channel: {recommendation['channel']}")
        safe_print(f"   - Reasoning: {recommendation['explanation'].replace(chr(10), ' ')}")
        safe_print(f"   - Generated Content: '{recommendation['content']}'")
    except Exception as e:
        safe_print(f"[ERROR] AI recommendations query failed: {e}")
        return

    # 3. Creating Segment
    safe_print("\n3. Creating Segment based on recommendations...")
    try:
        segment = send_post("/api/v1/campaigns/segments", {
            "name": "VIP Spenders Segment",
            "description": "Created programmatically by verify_flow",
            "rules": recommendation["rules"],
            "ai_explanation": recommendation["explanation"]
        }, token=token)
        segment_id = segment["id"]
        safe_print(f"[OK] Segment created successfully. ID: {segment_id}")
    except Exception as e:
        safe_print(f"[ERROR] Segment creation failed: {e}")
        return

    # 4. Creating Campaign Draft
    safe_print("\n4. Creating Campaign Draft...")
    try:
        draft = send_post("/api/v1/campaigns/create", {
            "name": "AI Early Access VIP Campaign",
            "segment_id": segment_id,
            "channel": recommendation["channel"],
            "content": recommendation["content"],
            "prompt": prompt
        }, token=token)
        campaign_id = draft["campaign"]["id"]
        safe_print(f"[OK] Campaign Draft created. ID: {campaign_id}")
    except Exception as e:
        safe_print(f"[ERROR] Campaign draft creation failed: {e}")
        return

    # 5. Dispatching Campaign
    safe_print("\n5. Dispatching Campaign (Asynchronous Send Queue)...")
    try:
        dispatch = send_post(f"/api/v1/campaigns/{campaign_id}/send", {
            "channel": recommendation["channel"],
            "content": recommendation["content"]
        }, token=token)
        safe_print(f"[OK] Campaign dispatched to {dispatch['targets_count']} targets. Monitoring live feedback receipts...")
    except Exception as e:
        safe_print(f"[ERROR] Campaign dispatch failed: {e}")
        return

    # 6. Poll campaign metrics to trace webhook callback lifecycle
    safe_print("\n6. Polling campaign metrics to track webhook updates in real time:")
    safe_print("--------------------------------------------------------------------------------")
    safe_print("Time | Sent | Delivered | Opened | Read | Clicked | Converted | Campaign Status")
    safe_print("--------------------------------------------------------------------------------")
    
    start_time = time.time()
    while time.time() - start_time < 30:
        campaigns = send_get("/api/v1/campaigns/", token=token)
        campaign = next((c for c in campaigns if c["id"] == campaign_id), None)
        if campaign:
          m = campaign["metrics"]
          safe_print(f"{int(time.time() - start_time):2}s   | {m['total']:4} | {m['delivered']:9} | {m['opened']:6} | {m['read']:4} | {m['clicked']:7} | {m['converted']:9} | {campaign['status']}")
          if m["converted"] == dispatch["targets_count"]:
              safe_print("\n[SUCCESS] Verification Success! All recipients converted successfully via carrier callbacks.")
              break
        time.sleep(3)
    else:
        safe_print("\nVerification complete. Some recipients processed.")

if __name__ == "__main__":
    verify()
