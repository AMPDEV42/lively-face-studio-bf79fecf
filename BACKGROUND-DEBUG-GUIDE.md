# Background Display Debug Guide 🔍

## 🎯 **Issue**: Background images load but don't display in 3D scene

## 🔧 **Fixes Applied:**

### 1. **Enhanced Environment Manager**
- ✅ Smaller sphere radius (15 instead of 50) for better visibility
- ✅ Dual approach: scene.background + sphere geometry
- ✅ Better texture configuration with flipY = false
- ✅ Added renderOrder = -1 for proper layering
- ✅ Enhanced logging for debugging

### 2. **Disabled Supabase Temporarily**
- ✅ Skip Supabase bucket checks to focus on display issue
- ✅ Use localStorage only for custom uploads
- ✅ Cleaner console logs without Supabase errors

### 3. **Improved Cleanup**
- ✅ Better background clearing with proper disposal
- ✅ Enhanced logging to track operations

## 🧪 **Testing Steps:**

### **Step 1: Refresh & Test**
1. **Refresh aplikasi** untuk load fixes
2. **Open Background Selector** (image icon, bottom-left)
3. **Select any background** (e.g., Cyberpunk City)
4. **Watch console logs** for detailed debugging info

### **Expected Console Logs:**
```
[Environment] Background cleared
[Environment] Loading custom image background: /backgrounds/thumbs/ChatGPT Image 24 Apr 2026, 18.45.05.png
[Environment] Image loaded successfully, size: 1024 x 1024
[Environment] Custom image background applied - both scene background and sphere
[Environment] Scene children count: X
```

### **Step 2: Visual Verification**
- **Look at 3D scene** - Background should be visible behind VRM model
- **Try different backgrounds** - Each should change the scene
- **Check both approaches**:
  - Scene background (flat behind everything)
  - Sphere background (360° environment)

### **Step 3: Debug if Still Not Visible**

#### **Check Camera Position:**
- Background might be there but camera too close/far
- Try different camera presets (medium-shot, close-up, etc.)

#### **Check Lighting:**
- Very bright lighting might wash out background
- Try different lighting presets

#### **Check Model Position:**
- VRM model might be blocking view
- Try moving camera around

## 🔍 **Debugging Console Commands:**

Open browser console dan run:

```javascript
// Check if background sphere exists
console.log('Scene children:', window.scene?.children?.length);
console.log('Environment sphere:', window.scene?.getObjectByName('EnvironmentSphere'));

// Check scene background
console.log('Scene background:', window.scene?.background);

// Check camera position
console.log('Camera position:', window.camera?.position);
```

## 🛠️ **Alternative Approaches if Still Not Working:**

### **Approach 1: Plane Background**
Instead of sphere, use a large plane behind model:

```typescript
// Create background plane
const geometry = new THREE.PlaneGeometry(50, 50);
const material = new THREE.MeshBasicMaterial({ map: texture });
const plane = new THREE.Mesh(geometry, material);
plane.position.set(0, 0, -10);
scene.add(plane);
```

### **Approach 2: Skybox Approach**
Use proper skybox with 6 faces:

```typescript
// Create skybox
const loader = new THREE.CubeTextureLoader();
const skybox = loader.load([texture, texture, texture, texture, texture, texture]);
scene.background = skybox;
```

### **Approach 3: Simple Scene Background**
Just use scene.background without sphere:

```typescript
// Simplest approach
scene.background = texture;
```

## 📊 **Success Indicators:**

### ✅ **Background Working:**
- Console shows successful image loading
- Scene background changes when selecting different images
- Visual difference in 3D scene background
- No console errors during selection

### ❌ **Still Not Working:**
- Image loads but no visual change
- Console errors during texture loading
- Background appears black/empty
- Camera/lighting issues

## 🚀 **Next Steps Based on Results:**

### **If Working:**
- ✅ Re-enable Supabase when credentials available
- ✅ Add more background images
- ✅ Optimize performance
- ✅ Add background categories

### **If Still Issues:**
- 🔧 Try alternative approaches above
- 🔧 Check camera/lighting settings
- 🔧 Verify image file formats
- 🔧 Test with different image sizes

---

**Ready to Test!** 🧪

Fixes sudah applied untuk background display issue. Silakan test dan share console logs untuk debugging lebih lanjut jika masih ada masalah!