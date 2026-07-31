use std::ffi::CString;
use std::os::raw::c_char;
use rand::Rng;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, KeyInit};
use sha2::{Sha256, Digest};
use zeroize::Zeroize;

/// Decrypts an AES-256-GCM payload in secure memory,
/// computes SHA-256 fingerprint, compares to expected,
/// then zeroizes plaintext before returning.
/// Returns "MATCH" or "NO_MATCH" — plaintext NEVER crosses FFI boundary.
#[no_mangle]
pub extern "C" fn secure_attest(
    encrypted_hex: *const c_char,
    iv_hex: *const c_char,
    auth_tag_hex: *const c_char,
    master_key_hex: *const c_char,
    expected_fingerprint_hex: *const c_char,
) -> *mut c_char {
    let result = std::panic::catch_unwind(|| {
        unsafe {
            // Parse C strings
            let enc = std::ffi::CStr::from_ptr(encrypted_hex).to_str().unwrap_or("");
            let iv_s = std::ffi::CStr::from_ptr(iv_hex).to_str().unwrap_or("");
            let tag_s = std::ffi::CStr::from_ptr(auth_tag_hex).to_str().unwrap_or("");
            let key_s = std::ffi::CStr::from_ptr(master_key_hex).to_str().unwrap_or("");
            let fp_s = std::ffi::CStr::from_ptr(expected_fingerprint_hex).to_str().unwrap_or("");

            // Decode hex
            let key_bytes = hex::decode(key_s).unwrap_or_default();
            let iv_bytes = hex::decode(iv_s).unwrap_or_default();
            let tag_bytes = hex::decode(tag_s).unwrap_or_default();
            let enc_bytes = hex::decode(enc).unwrap_or_default();

            // Construct ciphertext + auth tag (GCM appends tag)
            let mut ciphertext_with_tag = enc_bytes;
            ciphertext_with_tag.extend_from_slice(&tag_bytes);

            // Decrypt
            let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
            let cipher = Aes256Gcm::new(key);
            let nonce = Nonce::from_slice(&iv_bytes);

            match cipher.decrypt(nonce, ciphertext_with_tag.as_ref()) {
                Ok(mut plaintext) => {
                    // Compute fingerprint in secure memory
                    let mut hasher = Sha256::new();
                    hasher.update(&plaintext);
                    let hash = hasher.finalize();
                    let computed_fp = hex::encode(hash);

                    // ZEROIZE plaintext immediately — it never leaves Rust
                    plaintext.zeroize();

                    if computed_fp == fp_s {
                        "MATCH".to_string()
                    } else {
                        "NO_MATCH".to_string()
                    }
                }
                Err(_) => "DECRYPT_FAILED".to_string()
            }
        }
    });

    let output = result.unwrap_or_else(|_| "PANIC".to_string());
    CString::new(output).unwrap().into_raw()
}

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