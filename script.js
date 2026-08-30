/* Настройки перед публикацией */
const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxrdBYDNRBxB4--yMeXNeVxp-BcRBr71PUqkMjX9VgHtSFPsWvhQq9TZ9t7-9RAk3l88w/exec";
const PAVEL_PHONE = "+79874848342";
const DARINA_PHONE = "+79093527454";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

window.addEventListener("load", () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.setTimeout(() => $(".preloader")?.classList.add("is-hidden"), reducedMotion ? 500 : 3300);
});

const header = $(".site-header");
const menuButton = $(".menu-toggle");
const nav = $(".nav");
window.addEventListener("scroll", () => header?.classList.toggle("is-scrolled", scrollY > 30), { passive: true });
menuButton?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(open));
});
$$(".nav a").forEach(link => link.addEventListener("click", () => {
  nav?.classList.remove("is-open");
  menuButton?.setAttribute("aria-expanded", "false");
}));

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const delay = Number(entry.target.dataset.delay || 0);
    window.setTimeout(() => entry.target.classList.add("is-visible"), delay);
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.13 });
$$(".reveal").forEach(el => revealObserver.observe(el));

function updateCountdown() {
  const box = $("[data-countdown]");
  if (!box) return;
  const target = new Date(box.dataset.countdown).getTime();
  const delta = Math.max(0, target - Date.now());
  const values = {
    days: Math.floor(delta / 86400000),
    hours: Math.floor(delta / 3600000) % 24,
    minutes: Math.floor(delta / 60000) % 60,
    seconds: Math.floor(delta / 1000) % 60
  };
  Object.entries(values).forEach(([unit, value]) => {
    const el = box.querySelector(`[data-unit="${unit}"]`);
    if (el) el.textContent = String(value).padStart(2, "0");
  });
}
updateCountdown();
window.setInterval(updateCountdown, 1000);

const slides = $$(".slide");
const dotsBox = $(".slider-dots");
let slideIndex = 0;
function showSlide(index) {
  if (!slides.length) return;
  slideIndex = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle("is-active", i === slideIndex));
  $$("button", dotsBox).forEach((dot, i) => dot.classList.toggle("is-active", i === slideIndex));
}
slides.forEach((_, index) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.setAttribute("aria-label", `Показать фотографию ${index + 1}`);
  dot.addEventListener("click", () => showSlide(index));
  dotsBox?.append(dot);
});
$(".slider-button.prev")?.addEventListener("click", () => showSlide(slideIndex - 1));
$(".slider-button.next")?.addEventListener("click", () => showSlide(slideIndex + 1));
showSlide(0);
let autoplay = window.setInterval(() => showSlide(slideIndex + 1), 5500);
$(".slider")?.addEventListener("pointerenter", () => clearInterval(autoplay));

function configurePhone(kind, value) {
  const link = document.querySelector(`[data-phone="${kind}"]`);
  if (!link) return;
  if (value) {
    link.href = `tel:${value.replace(/[^+\d]/g, "")}`;
    link.textContent = value;
  } else {
    link.removeAttribute("href");
    link.classList.add("is-placeholder");
  }
}
configurePhone("pavel", PAVEL_PHONE);
configurePhone("darina", DARINA_PHONE);

function localResponses() {
  try { return JSON.parse(localStorage.getItem("pavelDarinaRsvp") || "[]"); }
  catch { return []; }
}
function saveLocal(payload) {
  const data = localResponses();
  data.push(payload);
  localStorage.setItem("pavelDarinaRsvp", JSON.stringify(data));
}
function setStatus(text, type = "ok") {
  const status = $("#formStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `form-status is-visible ${type}`;
}

$("#rsvpForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const button = $(".submit-button", form);
  button.disabled = true;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.submittedAt = new Date().toISOString();
  payload.source = location.href;
  saveLocal(payload);
  try {
    if (GOOGLE_APPS_SCRIPT_URL) {
      await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      setStatus("Спасибо! Ваш ответ отправлен Павлу и Дарине. До встречи на борту!");
    } else {
      setStatus("Спасибо! Ответ сохранён на этом устройстве. После подключения Google Таблицы он будет отправляться автоматически.");
    }
    form.reset();
    confetti();
  } catch (error) {
    setStatus("Ответ сохранён на этом устройстве, но отправить его в таблицу не удалось. Попробуйте ещё раз или позвоните нам.", "error");
  } finally {
    button.disabled = false;
  }
});

function confetti() {
  const colors = ["#94202b", "#b12d2b", "#2d4e37", "#f5df95", "#ddc9a6"];
  for (let i = 0; i < 28; i += 1) {
    const piece = document.createElement("i");
    piece.style.cssText = `position:fixed;z-index:999;left:${45 + Math.random() * 10}vw;top:45vh;width:8px;height:12px;background:${colors[i % colors.length]};pointer-events:none;transform:rotate(${Math.random()*180}deg);transition:transform 1.2s ease-out,opacity 1.2s;`;
    document.body.append(piece);
    requestAnimationFrame(() => {
      piece.style.transform = `translate(${(Math.random()-.5)*520}px,${180+Math.random()*300}px) rotate(${360+Math.random()*540}deg)`;
      piece.style.opacity = "0";
    });
    setTimeout(() => piece.remove(), 1300);
  }
}

const exportButton = $("#exportCsv");
if (new URLSearchParams(location.search).has("admin")) exportButton.hidden = false;
exportButton?.addEventListener("click", () => {
  const data = localResponses();
  if (!data.length) return alert("На этом устройстве пока нет сохранённых ответов.");
  const headers = ["submittedAt", "names", "attendance", "guestCount", "phone", "comment", "source"];
  const escape = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = "\uFEFF" + [headers.join(";"), ...data.map(row => headers.map(key => escape(row[key])).join(";"))].join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.download = "wedding-rsvp.csv";
  link.click();
  URL.revokeObjectURL(link.href);
});

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const heroVisual = $(".hero-visual");
  window.addEventListener("pointermove", event => {
    if (!heroVisual || innerWidth < 900) return;
    const x = (event.clientX / innerWidth - .5) * 8;
    const y = (event.clientY / innerHeight - .5) * 8;
    heroVisual.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });
}
