export const SIGNUP_WHATSAPP_NUMBER = "5511916651776";
export const SIGNUP_WHATSAPP_MESSAGE = "Quero me cadastrar no Cardápio Fácil";

export const SIGNUP_WHATSAPP_URL = `https://wa.me/${SIGNUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  SIGNUP_WHATSAPP_MESSAGE
)}`;

export function openSignupWhatsApp() {
  window.open(SIGNUP_WHATSAPP_URL, "_blank", "noopener,noreferrer");
}
