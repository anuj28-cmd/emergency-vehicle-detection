import importlib.util
from pathlib import Path

# Load backend/app.py as a module so imports work regardless of package layout
repo_root = Path(__file__).resolve().parents[1]
app_path = repo_root / 'backend' / 'app.py'
spec = importlib.util.spec_from_file_location('backend_app', str(app_path))
backend_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend_module)
app = backend_module.app

def run_test():
    client = app.test_client()

    # Login with default admin created by the database
    login_resp = client.post('/api/login', json={'email': 'admin@example.com', 'password': 'admin'})
    print('login status:', login_resp.status_code, login_resp.get_json())

    token = None
    if login_resp.status_code == 200 and login_resp.get_json():
        token = login_resp.get_json().get('token')

    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'

    image_path = 'Test/Ambulance_in_traffic.jpg'
    try:
        with open(image_path, 'rb') as f:
            data = {'file': (f, 'Ambulance_in_traffic.jpg')}
            detect_resp = client.post('/api/detect', data=data, content_type='multipart/form-data', headers=headers)
            print('detect status:', detect_resp.status_code, detect_resp.get_json())
    except FileNotFoundError:
        print('Test image not found at', image_path)

if __name__ == '__main__':
    run_test()
