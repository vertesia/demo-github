import { expect, test } from 'vitest';
import { HunkSet } from './patch.js';

test('Test HunkSet parsing', async () => {
    const h = HunkSet.parse(`\
@@ -13,9 +13,10 @@ import ObjectsIcon from './assets/objects.svg?react';
 import TypesIcon from './assets/types1.svg?react';
 import WorkflowIcon2 from './assets/workflow.svg?react';
 import WorkflowIcon from './assets/workflow2.svg?react';
-import SelectProjectNav from './features/project/SelectProjectNav';
 import { AnyOf } from './session/permissions/helpers';
 import { SecureSidebarItem } from './session/permissions/SecureSidebarItem';
+import AccountSelection from './features/accounts/AccountSelection';
+import SelectProjectNav from './features/project/SelectProjectNav';
 
 const { isRootPath } = Path;
 
@@ -50,10 +51,13 @@ export function AppMenu({ }: AppMenuProps) {
 
     return <>
         {
-
-            <SidebarSection>
-                <SelectProjectNav />
-            </SidebarSection>
+            <AccountSelection />
+        }
+        {
+            <SelectProjectNav />
+        }
+        {
+            <hr className='border-t border-gray-300' />
         }
 
         {
`);
    expect(h.isLineValid("RIGHT", 52)).toBe(true);
    expect(h.isLineValid("RIGHT", 58)).toBe(true);
});

