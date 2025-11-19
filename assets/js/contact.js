/* contact.js — handles contact form submission */
const API_BASE = "https://mehta-masala-backend.onrender.com"; // same as main.js

document.addEventListener("DOMContentLoaded", function(){
  const form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", async function(e){
    e.preventDefault();
    const hp = document.getElementById("hp_field").value;
    if (hp && hp.trim().length > 0) {
      // honeypot filled -> likely spam
      document.getElementById("form-status").textContent = "Submission blocked.";
      return;
    }
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !email || !message) {
      document.getElementById("form-status").textContent = "Please fill required fields.";
      return;
    }

    try {
      document.getElementById("form-status").textContent = "Sending...";
      const resp = await fetch(API_BASE + "/send-message", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ name, email, phone, subject, message, hp_field: hp })
      });
      const data = await resp.json();
      if (data && data.success) {
        document.getElementById("form-status").textContent = "Message sent. We will contact you soon.";
        form.reset();
      } else {
        document.getElementById("form-status").textContent = "Could not send message. Try again later.";
      }
    } catch (err) {
      console.error(err);
      document.getElementById("form-status").textContent = "Error sending message.";
    }
  });
});
