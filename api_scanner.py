import os
import re
from collections import defaultdict

frontend_dir = r"d:\Projects_RealTime\Acrovix\Admin\admin-frontend\src"
backend_dir = r"d:\Projects_RealTime\Acrovix\Admin\admin-backend\src\main\java\com\acrovix\admin\controller"

frontend_api_calls = []
for root, dirs, files in os.walk(frontend_dir):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                content = file.read()
                matches = re.findall(r"fetchApi\s*\(\s*['\"`](/?[^'\"`\?]+)", content)
                for match in matches:
                    frontend_api_calls.append((f, match))

backend_endpoints = []
class_mapping_re = re.compile(r'@RequestMapping\s*\(\s*["\']([^"\']+)["\']\s*\)')
method_mapping_re = re.compile(r'@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?["\']([^"\']*)["\']\s*\)')
for root, dirs, files in os.walk(backend_dir):
    for f in files:
        if f.endswith('.java'):
            with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                content = file.read()
                
                class_match = class_mapping_re.search(content)
                base_path = class_match.group(1) if class_match else ""
                
                method_matches = method_mapping_re.findall(content)
                for method, path in method_matches:
                    full_path = (base_path + path).replace('//', '/')
                    backend_endpoints.append((f, method.upper(), full_path))

print("=== FRONTEND CALLS ===")
for item in sorted(set(frontend_api_calls)):
    print(f"{item[0]}: {item[1]}")

print("\n=== BACKEND ENDPOINTS ===")
for item in sorted(set(backend_endpoints)):
    print(f"{item[0]} [{item[1]}]: {item[2]}")
