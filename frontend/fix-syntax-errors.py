import re
import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Fix double environment variable pattern
    content = re.sub(
        r"import\.meta\.env\.VITE_API_URL \|\| \(import\.meta\.env\.VITE_API_URL \|\| 'http://localhost:3000'\)'",
        r"import.meta.env.VITE_API_URL || 'http://localhost:3000'",
        content
    )
    
    # Fix missing + in string concatenation
    content = re.sub(
        r"\(import\.meta\.env\.VITE_API_URL \|\| '[^']*'\)/api/",
        r"(import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/",
        content
    )
    
    content = re.sub(
        r'\(import\.meta\.env\.VITE_API_URL \|\| "[^"]*"\)/api/',
        r'(import.meta.env.VITE_API_URL || "http://localhost:3000") + \'/api/',
        content
    )
    
    # Fix BASE_URL in api.ts
    content = re.sub(
        r"const BASE_URL = import\.meta\.env\.VITE_API_URL \? `\$\{import\.meta\.env\.VITE_API_URL\}/api` : \(import\.meta\.env\.VITE_API_URL \|\| '[^']*'\)/api';",
        r"const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3000/api';",
        content
    )
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed: {filepath}")
        return True
    return False

# Find all TypeScript files
count = 0
for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            filepath = os.path.join(root, file)
            if fix_file(filepath):
                count += 1

print(f"\nTotal files fixed: {count}")
