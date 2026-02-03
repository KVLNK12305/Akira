use std::ffi::CString;
use std::os::raw::c_char;
use rand::Rng;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};

// 🛡️ The "Chaos Engine" - Generates a secure AKIRA key
#[no_mangle]
pub extern "C" fn generate_akira_key() -> *mut c_char {
    // 1. Generate 32 bytes of pure chaos (Entropy)
    let mut rng = rand::thread_rng();
    let random_bytes: [u8; 32] = rng.gen();

    // 2. Encode to Base64 (Url Safe)
    let key_string = URL_SAFE_NO_PAD.encode(&random_bytes);
    
    // 3. Add the Signature Prefix
    let final_key = format!("akira_rust_{}", key_string);

    // 4. Convert to C-String (So Bun can read it)
    let c_str = CString::new(final_key).unwrap();
    
    // ⚠️ CRITICAL: We pass ownership of this memory to Bun.
    // Bun must not try to free it using JS GC, or we need a free function.
    // For this lab, we will let it leak (it's tiny) or write a free fn.
    c_str.into_raw()
}

// 🧹 Cleanup Function (Good practice for Systems Programming)
#[no_mangle]
pub unsafe extern "C" fn free_akira_key(s: *mut c_char) {
    if s.is_null() { return }
    let _ = CString::from_raw(s); // Re-take ownership to drop it
}

// The #[no_mangle] ensures the function's symbol name in the final binary is exactly "generate_akira_key" and "free_akira_key".