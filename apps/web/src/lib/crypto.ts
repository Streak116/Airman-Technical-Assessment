import CryptoJS from 'crypto-js';

const SALT = process.env.NEXT_PUBLIC_PAYLOAD_SALT || 'devsafe-salt-fallback';

export const encryptData = (data: string): string => {
    if (!data) return data;
    return CryptoJS.AES.encrypt(data, SALT).toString();
};

export const decryptData = (ciphertext: string): string => {
    if (!ciphertext) return ciphertext;
    const bytes = CryptoJS.AES.decrypt(ciphertext, SALT);
    return bytes.toString(CryptoJS.enc.Utf8);
};
