import json

def compare_files():
    files = ["company", "customers", "products", "invoices"]
    for name in files:
        print(f"\n--- Comparing {name} ---")
        try:
            with open(f"/home/premkumar/IVK_Garments/Business_OS/scripts/cloud_backup/{name}_cloud.json") as f:
                cloud = json.load(f)
            with open(f"/home/premkumar/IVK_Garments/Business_OS/scripts/local_backup/{name}_local.json") as f:
                local = json.load(f)
            
            print(f"Cloud rows: {len(cloud)}, Local rows: {len(local)}")
            
            # Simple diff by ID
            cloud_map = {str(item.get("id", "default")): item for item in cloud}
            local_map = {str(item.get("id", "default")): item for item in local}
            
            # Key mismatches
            cloud_only = set(cloud_map.keys()) - set(local_map.keys())
            local_only = set(local_map.keys()) - set(cloud_map.keys())
            if cloud_only:
                print(f"  Cloud only keys: {cloud_only}")
            if local_only:
                print(f"  Local only keys: {local_only}")
                
            # Content comparison
            common_keys = set(cloud_map.keys()) & set(local_map.keys())
            diff_count = 0
            for k in common_keys:
                c_item = cloud_map[k]
                l_item = local_map[k]
                
                # Compare fields (excluding DB metadata like updated_at, id as integer vs string)
                mismatches = []
                for field in set(c_item.keys()) | set(l_item.keys()):
                    if field in ["updated_at", "id", "items", "customFields", "customer"]:
                        continue
                    c_val = c_item.get(field)
                    l_val = l_item.get(field)
                    # Normalize string representations of float/int
                    if str(c_val) != str(l_val):
                        # check if one is None and other is ''
                        if (c_val is None and l_val == '') or (l_val is None and c_val == ''):
                            continue
                        mismatches.append((field, c_val, l_val))
                
                if mismatches:
                    diff_count += 1
                    print(f"  Difference in key '{k}':")
                    for field, c_val, l_val in mismatches:
                        print(f"    - Field '{field}': Cloud='{c_val}', Local='{l_val}'")
            
            if not cloud_only and not local_only and diff_count == 0:
                print("  ✓ Tables are identical!")
        except Exception as e:
            print(f"Error comparing {name}: {e}")

compare_files()
