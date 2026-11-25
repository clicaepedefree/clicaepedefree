export const SIGNUP_WHATSAPP_NUMBER = "5511916651776";
export const SIGNUP_WHATSAPP_MESSAGE = "Quero me cadastrar no Cardápio Fácil";

export const SIGNUP_WHATSAPP_URL = `https://wa.me/${SIGNUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  SIGNUP_WHATSAPP_MESSAGE
)}`;

export function openSignupWhatsApp() {
  window.open(SIGNUP_WHATSAPP_URL, "_blank", "noopener,noreferrer");
}

export const SPECIALIST_WHATSAPP_URL = `https://wa.me/${SIGNUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá! Gostaria de falar com um especialista sobre o sistema."
)}`;

export const QUESTIONS_WHATSAPP_URL = `https://wa.me/${SIGNUP_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá! Tenho uma dúvida sobre o sistema."
)}`;
