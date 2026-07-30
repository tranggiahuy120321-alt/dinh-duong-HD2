# Security Specification - Sunflower Nutrition App

## 1. Data Invariants
- **Ingredients Catalog Integrity**: The system must store all standard and custom ingredients within a single central configuration document `app_data/ingredients_catalog`. Any write to this path must strictly contain a `list` property containing valid ingredient entries.
- **Saved Menus Validation**: Individual saved menus must be validated with exact key structures: `id`, `name`, `ageGroup`, `childrenCount`, `budgetPerChild`, `meals`, and `updatedAt`. Missing keys or extra unrecognized keys are rejected to avoid payload pollution.
- **Document ID Safety**: All document IDs used for saved menus must be alphanumeric (plus hyphens or underscores) and strictly bounded under 128 characters to avoid injection/denial-of-service/ID poisoning.

## 2. The "Dirty Dozen" Malicious Payloads

We define 12 malicious payloads designed to attempt to bypass our schema rules or pollute the database:

1. **Missing Schema Keys (SavedMenu)**:
   ```json
   {
     "id": "menu_12345",
     "name": "Invalid Menu"
   }
   ```
2. **Ghost/Shadow Field Injection**:
   ```json
   {
     "id": "menu_12345",
     "name": "Malicious Menu",
     "ageGroup": "mau_giao_3_6",
     "childrenCount": 50,
     "budgetPerChild": 30000,
     "meals": [],
     "updatedAt": "2026-07-13",
     "isAdmin": true
   }
   ```
3. **Invalid Data Type (childrenCount)**:
   ```json
   {
     "id": "menu_12345",
     "name": "Malicious Menu",
     "ageGroup": "mau_giao_3_6",
     "childrenCount": "fifty",
     "budgetPerChild": 30000,
     "meals": [],
     "updatedAt": "2026-07-13"
   }
   ```
4. **Oversized String Injection (name)**:
   ```json
   {
     "id": "menu_12345",
     "name": "[Repeated A characters up to 1000 length]",
     "ageGroup": "mau_giao_3_6",
     "childrenCount": 50,
     "budgetPerChild": 30000,
     "meals": [],
     "updatedAt": "2026-07-13"
   }
   ```
5. **Path / ID Poisoning**:
   ```json
   {
     "id": "menu_../../../poison",
     "name": "Poison ID Menu",
     "ageGroup": "mau_giao_3_6",
     "childrenCount": 50,
     "budgetPerChild": 30000,
     "meals": [],
     "updatedAt": "2026-07-13"
   }
   ```
6. **Ingredients Catalog Overwriting - Incorrect Type**:
   ```json
   {
     "list": "Not A List"
   }
   ```
7. **Ingredients Catalog Overwriting - Extra Ghost Field**:
   ```json
   {
     "list": [],
     "extraField": "ghost"
   }
   ```
8. **Malicious Delete attempt on Ingredients Catalog**:
   - Client sends dynamic delete request to `app_data/ingredients_catalog`.
9. **Oversized Array Injection (meals)**:
   - A menu containing over 100 empty meals in a list to exhaust reading bandwidth.
10. **Identity / ID Discrepancy**:
    - Menu object ID mismatch with Firestore Document ID path.
11. **Injecting Null values into required fields**:
    - `budgetPerChild` is set to `null` to bypass range checking.
12. **Malicious write outside allowed collections**:
    - Writing to `/admins/someUid` or random root paths.

## 3. Test Coverage Results

All malicious payloads are confirmed blocked (`PERMISSION_DENIED`) by the strict `firestore.rules` configuration.
