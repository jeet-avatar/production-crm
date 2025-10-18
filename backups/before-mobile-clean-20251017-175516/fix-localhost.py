import re
import os

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern 1: 'http://localhost:3000 (single quotes)
    content = re.sub(
        r"'http://localhost:3000",
        r"(import.meta.env.VITE_API_URL || 'http://localhost:3000')",
        content
    )
    
    # Pattern 2: "http://localhost:3000 (double quotes)
    content = re.sub(
        r'"http://localhost:3000',
        r'(import.meta.env.VITE_API_URL || "http://localhost:3000")',
        content
    )
    
    # Pattern 3: `http://localhost:3000 (template literals)
    content = re.sub(
        r'`http://localhost:3000',
        r'`${import.meta.env.VITE_API_URL || "http://localhost:3000"}',
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
