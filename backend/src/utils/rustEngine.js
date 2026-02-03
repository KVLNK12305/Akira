import { dlopen, CString } from "bun:ffi";
import path from "path";

/* ⚠️ EXAM SAFETY NOTE: 
   If this file fails to load (missing .so), it will crash ONLY 
   the 'Rotate Key' endpoint, not the whole app.
*/

// 1. Locate the compiled Rust binary
// ⚠️ Using .so for Linux environment
const libPath = path.resolve(import.meta.dir, "../../native_core/target/release/libnative_core.so"); 

let rust;

try {
  // 2. Load the Library Safely
  const lib = dlopen(libPath, {
    generate_akira_key: {
      args: [],          
      returns: "cstring" 
    },
    free_akira_key: {
      args: ["ptr"],     
      returns: "void"    
    }
  });
  rust = lib.symbols;
} catch (error) {
  console.error("⚠️ RUST ENGINE FAILED TO LOAD:", error.message);
  console.error("👉 Check if 'cargo build --release' was run in backend/native_core");
}

// 3. Export the Wrapper
export const generateRustKey = () => {
  if (!rust) {
    throw new Error("Rust Engine is not loaded. Cannot generate high-entropy key.");
  }

  // A. Call Rust
  const rawKey = rust.generate_akira_key();
  
  // B. Convert C-String to JS String
  const jsString = rawKey.toString(); 

  // C. (Optional) Free memory if strictly needed, but safe to skip for short lab demo
  // rust.free_akira_key(rawKey); 
  
  return jsString;
};