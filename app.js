// ══════════════════════════════════════════════════════
// app.js — Undangan Muhammad Hafiizh & Mega Silviyati
// ══════════════════════════════════════════════════════

// ── KONFIGURASI ────────────────────────────────────────
const SUPABASE_URL = "https://dqdychdggpblvjylzwdo.supabase.co";
const SUPABASE_KEY = "sb_publishable_n7XSO8PC8MvSR0gw6S-TIg_HLsoUyt0";
const WEDDING_ID = "dce6866c-a1c5-468c-84fc-5e7edd13c141";
const WEDDING_DATE = "2022-08-28T10:00:00";
const COUPLE_NAMES = "Muhammad Hafiizh & Mega Silviyati";

// TODO: Ganti URL-URL di bawah ini setelah foto tersedia
const PHOTOS = [
	// 'https://your-storage.supabase.co/foto1.jpg',
	// 'https://your-storage.supabase.co/foto2.jpg',
	// 'https://your-storage.supabase.co/foto3.jpg',
];

// ── INISIALISASI SUPABASE ──────────────────────────────
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── STATE ──────────────────────────────────────────────
let currentLightboxIndex = 0;
let audioPlayer = null;
let isPlaying = false;
let countdownInterval = null;
let realtimeChannel = null;

// ══════════════════════════════════════════════════════
// ── 1. INIT ─ Jalankan semua saat DOM siap
// ══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
	initGuestName();
	initGallery();
	loadMusicUrl();
	initFormListeners();
});

// ══════════════════════════════════════════════════════
// ── 2. PERSONALIZED NAMA TAMU
//    Baca ?g= dari URL, decode, tampilkan
// ══════════════════════════════════════════════════════
function initGuestName() {
	try {
		const params = new URLSearchParams(window.location.search);
		const rawName = params.get("g");
		const guestEl = document.getElementById("guestName");
		if (!guestEl) return;

		if (rawName && rawName.trim()) {
			// decodeURIComponent otomatis decode %20, + sudah di-handle URLSearchParams
			const decodedName = rawName.trim();
			guestEl.textContent = decodedName;
		} else {
			guestEl.textContent = "Tamu Undangan";
		}
	} catch (err) {
		// Graceful fallback — tidak tampilkan error teknis ke user
		const guestEl = document.getElementById("guestName");
		if (guestEl) guestEl.textContent = "Tamu Undangan";
	}
}

// ══════════════════════════════════════════════════════
// ── 3. BUKA UNDANGAN
//    Sembunyikan cover, tampilkan konten utama
// ══════════════════════════════════════════════════════
function openInvitation() {
	const cover = document.getElementById("cover");
	const content = document.getElementById("mainContent");

	if (!cover || !content) return;

	// Animasi fade out cover
	cover.style.transition = "opacity 0.6s ease, transform 0.6s ease";
	cover.style.opacity = "0";
	cover.style.transform = "scale(0.98)";

	setTimeout(() => {
		cover.style.display = "none";
		content.classList.remove("hidden");

		// Inisialisasi fitur setelah konten terbuka
		initScrollReveal();
		initCountdown();
		loadWishes();
		subscribeWishes();

		// Scroll ke atas dengan smooth
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, 600);
}

// ══════════════════════════════════════════════════════
// ── 4. SCROLL REVEAL
//    Intersection Observer untuk class .reveal
// ══════════════════════════════════════════════════════
function initScrollReveal() {
	const revealEls = document.querySelectorAll(".reveal");

	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					entry.target.classList.add("visible");
					observer.unobserve(entry.target); // trigger sekali saja
				}
			});
		},
		{ threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
	);

	revealEls.forEach((el) => observer.observe(el));
}

// ══════════════════════════════════════════════════════
// ── 5. COUNTDOWN TIMER
//    Hitung mundur ke WEDDING_DATE, update tiap detik
// ══════════════════════════════════════════════════════
function initCountdown() {
	const weddingTime = new Date(WEDDING_DATE).getTime();
	const display = document.getElementById("countdownDisplay");
	const msg = document.getElementById("countdownMessage");

	function update() {
		const now = new Date().getTime();
		const diff = weddingTime - now;

		if (diff <= 0) {
			// Hari H sudah lewat
			if (display) display.style.display = "none";
			if (msg) {
				msg.classList.remove("hidden");
				msg.textContent = `Alhamdulillah — ${COUPLE_NAMES} kini telah resmi menjadi pasangan halal. 🤍`;
			}
			clearInterval(countdownInterval);
			return;
		}

		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diff % (1000 * 60)) / 1000);

		setCountValue("cdDays", days);
		setCountValue("cdHours", hours);
		setCountValue("cdMinutes", minutes);
		setCountValue("cdSeconds", seconds);
	}

	update();
	countdownInterval = setInterval(update, 1000);
}

/** Format angka dengan leading zero dan update element */
function setCountValue(id, val) {
	const el = document.getElementById(id);
	if (el) el.textContent = String(val).padStart(2, "0");
}

// ══════════════════════════════════════════════════════
// ── 6. GALERI FOTO + LIGHTBOX
// ══════════════════════════════════════════════════════
function initGallery() {
	const grid = document.getElementById("galeriGrid");
	if (!grid) return;

	if (!PHOTOS || PHOTOS.length === 0) {
		// Tampilkan placeholder jika belum ada foto
		const count = 6;
		for (let i = 0; i < count; i++) {
			const ph = document.createElement("div");
			ph.className = "galeri-placeholder";
			ph.innerHTML = `
        <span class="galeri-placeholder-icon">📷</span>
        <span>Foto segera hadir</span>
      `;
			grid.appendChild(ph);
		}
		return;
	}

	PHOTOS.forEach((url, index) => {
		const item = document.createElement("div");
		item.className = "galeri-item";
		item.setAttribute("role", "button");
		item.setAttribute("tabindex", "0");
		item.setAttribute("aria-label", `Foto ${index + 1}`);

		const img = document.createElement("img");
		img.src = url;
		img.alt = `Foto ${COUPLE_NAMES} ${index + 1}`;
		img.loading = "lazy";

		item.appendChild(img);
		item.addEventListener("click", () => openLightbox(index));
		item.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") openLightbox(index);
		});

		grid.appendChild(item);
	});
}

/** Buka lightbox pada index tertentu */
function openLightbox(index) {
	if (!PHOTOS || PHOTOS.length === 0) return;
	currentLightboxIndex = index;
	const lb = document.getElementById("lightbox");
	const img = document.getElementById("lightboxImg");
	if (lb && img) {
		img.src = PHOTOS[index];
		lb.classList.add("active");
		document.body.style.overflow = "hidden";
	}
}

function closeLightbox() {
	const lb = document.getElementById("lightbox");
	if (lb) {
		lb.classList.remove("active");
		document.body.style.overflow = "";
	}
}

function lightboxPrev(e) {
	e.stopPropagation();
	if (!PHOTOS || PHOTOS.length === 0) return;
	currentLightboxIndex =
		(currentLightboxIndex - 1 + PHOTOS.length) % PHOTOS.length;
	const img = document.getElementById("lightboxImg");
	if (img) img.src = PHOTOS[currentLightboxIndex];
}

function lightboxNext(e) {
	e.stopPropagation();
	if (!PHOTOS || PHOTOS.length === 0) return;
	currentLightboxIndex = (currentLightboxIndex + 1) % PHOTOS.length;
	const img = document.getElementById("lightboxImg");
	if (img) img.src = PHOTOS[currentLightboxIndex];
}

// Keyboard navigation untuk lightbox
document.addEventListener("keydown", (e) => {
	const lb = document.getElementById("lightbox");
	if (!lb || !lb.classList.contains("active")) return;
	if (e.key === "Escape") closeLightbox();
	if (e.key === "ArrowLeft") lightboxPrev({ stopPropagation: () => {} });
	if (e.key === "ArrowRight") lightboxNext({ stopPropagation: () => {} });
});

// ══════════════════════════════════════════════════════
// ── 7. MUSIK BACKGROUND
//    Load music_url dari tabel weddings
// ══════════════════════════════════════════════════════
async function loadMusicUrl() {
	try {
		const { data, error } = await db
			.from("weddings")
			.select("music_url")
			.eq("id", WEDDING_ID)
			.single();

		if (error || !data || !data.music_url) return; // Tidak ada musik — sembunyikan tombol

		// Ada URL musik → inisialisasi audio
		audioPlayer = new Audio(data.music_url);
		audioPlayer.loop = true;
		audioPlayer.volume = 0.5;

		// Tampilkan tombol musik
		const btn = document.getElementById("musicBtn");
		if (btn) btn.style.display = "flex";

		// Handle jika audio gagal load
		audioPlayer.addEventListener("error", () => {
			const btn = document.getElementById("musicBtn");
			if (btn) btn.style.display = "none";
		});
	} catch (err) {
		// Graceful fail — tidak tampilkan error ke user
	}
}

/** Toggle play/pause musik */
function toggleMusic() {
	if (!audioPlayer) return;

	const btn = document.getElementById("musicBtn");
	const icon = document.getElementById("musicIcon");

	if (isPlaying) {
		audioPlayer.pause();
		isPlaying = false;
		if (icon) icon.textContent = "♪";
		if (btn) btn.classList.remove("playing");
	} else {
		audioPlayer
			.play()
			.then(() => {
				isPlaying = true;
				if (icon) icon.textContent = "■";
				if (btn) btn.classList.add("playing");
			})
			.catch(() => {
				// Autoplay policy — tunggu interaksi
			});
	}
}

// ══════════════════════════════════════════════════════
// ── 8. RSVP
//    Validasi → insert ke Supabase → feedback personal
// ══════════════════════════════════════════════════════
async function submitRsvp() {
	const nameEl = document.getElementById("rsvpName");
	const attendanceEl = document.querySelector(
		'input[name="attendance"]:checked',
	);
	const countEl = document.getElementById("guestCount");
	const messageEl = document.getElementById("rsvpMessage");
	const btnEl = document.getElementById("btnRsvp");
	const btnText = document.getElementById("rsvpBtnText");
	const errorEl = document.getElementById("rsvpError");

	// Sembunyikan error sebelumnya
	if (errorEl) errorEl.classList.add("hidden");

	// Validasi
	if (!nameEl || !nameEl.value.trim()) {
		showRsvpError("Mohon isi nama lengkap kamu dulu ya. 🙏");
		nameEl && nameEl.focus();
		return;
	}
	if (!attendanceEl) {
		showRsvpError("Jangan lupa pilih konfirmasi kehadirannya ya. 😊");
		return;
	}

	// Loading state
	if (btnEl) btnEl.disabled = true;
	if (btnText) btnText.textContent = "Mengirim...";

	try {
		const payload = {
			wedding_id: WEDDING_ID,
			guest_id: null, // tidak pakai UUID tamu
			guest_name: nameEl.value.trim(),
			attendance: attendanceEl.value,
			guest_count:
				attendanceEl.value === "hadir" ? parseInt(countEl?.value || "1") : 0,
			message: messageEl?.value.trim() || null,
		};

		const { error } = await db.from("rsvps").insert([payload]);

		if (error) throw error;

		// Sukses
		document.getElementById("rsvpForm")?.classList.add("hidden");

		const successTitle = document.getElementById("rsvpSuccessMsg");
		const isHadir = attendanceEl.value === "hadir";

		if (successTitle) {
			successTitle.textContent = isHadir
				? `Jazakumullahu Khairan, ${nameEl.value.trim()}! Kami sangat menantikan kehadiranmu. 🌿`
				: `Jazakumullahu Khairan, ${nameEl.value.trim()}. Doa kamu sangat berarti bagi kami. 🤍`;
		}

		document.getElementById("rsvpSuccess")?.classList.remove("hidden");
	} catch (err) {
		// Error handling yang ramah
		if (btnEl) btnEl.disabled = false;
		if (btnText) btnText.textContent = "Kirim Konfirmasi";

		const msg = err?.message?.includes("duplicate")
			? "Kamu sepertinya sudah pernah mengisi konfirmasi ini. Terima kasih! 😊"
			: "Ups, ada sedikit gangguan. Silakan coba lagi beberapa saat ya. 🙏";

		showRsvpError(msg);
	}
}

function showRsvpError(message) {
	const errorEl = document.getElementById("rsvpError");
	const errorMsg = document.getElementById("rsvpErrorMsg");
	if (errorEl && errorMsg) {
		errorMsg.textContent = message;
		errorEl.classList.remove("hidden");
		errorEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
	}
}

// ══════════════════════════════════════════════════════
// ── 9. UCAPAN & DOA — Load Awal
// ══════════════════════════════════════════════════════
async function loadWishes() {
	const listEl = document.getElementById("wishList");
	const loadEl = document.getElementById("wishLoading");

	if (!listEl) return;

	try {
		const { data, error } = await db
			.from("wishes")
			.select("*")
			.eq("wedding_id", WEDDING_ID)
			.order("created_at", { ascending: false })
			.limit(50);

		if (error) throw error;

		if (loadEl) loadEl.remove();

		if (!data || data.length === 0) {
			listEl.innerHTML = `<p class="wish-empty">Jadilah yang pertama mengirim doa untuk mereka. 🤍</p>`;
			return;
		}

		data.forEach((wish) => appendWish(wish, false));
	} catch (err) {
		if (loadEl)
			loadEl.textContent = "Gagal memuat ucapan. Coba refresh halaman ya.";
	}
}

// ── Subscribe Realtime untuk ucapan baru ──────────────
function subscribeWishes() {
	if (realtimeChannel) return; // Sudah subscribe

	realtimeChannel = db
		.channel("wishes_realtime")
		.on(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: "wishes",
				filter: `wedding_id=eq.${WEDDING_ID}`,
			},
			(payload) => {
				if (payload.new) {
					const loadEl = document.getElementById("wishLoading");
					if (loadEl) loadEl.remove();

					const emptyEl = document.querySelector(".wish-empty");
					if (emptyEl) emptyEl.remove();

					appendWish(payload.new, true); // prepend = true untuk ucapan baru
				}
			},
		)
		.subscribe();
}

/** Tambahkan item ucapan ke DOM */
function appendWish(wish, prepend = false) {
	const listEl = document.getElementById("wishList");
	if (!listEl) return;

	const item = document.createElement("div");
	item.className = "wish-item";

	const timeAgo = formatTimeAgo(wish.created_at);

	item.innerHTML = `
    <p class="wish-item-name">${escapeHtml(wish.name || "Anonim")}</p>
    <p class="wish-item-msg">${escapeHtml(wish.message || "")}</p>
    <p class="wish-item-time">${timeAgo}</p>
  `;

	if (prepend) {
		listEl.insertBefore(item, listEl.firstChild);
	} else {
		listEl.appendChild(item);
	}
}

// ── Submit Ucapan ──────────────────────────────────────
async function submitWish() {
	const nameEl = document.getElementById("wishName");
	const msgEl = document.getElementById("wishMessage");
	const btnEl = document.getElementById("btnWish");
	const btnTxt = document.getElementById("wishBtnText");

	if (!nameEl?.value.trim()) {
		nameEl && nameEl.focus();
		nameEl && (nameEl.style.borderColor = "rgba(200, 80, 60, 0.5)");
		setTimeout(() => {
			if (nameEl) nameEl.style.borderColor = "";
		}, 2000);
		return;
	}
	if (!msgEl?.value.trim()) {
		msgEl && msgEl.focus();
		msgEl && (msgEl.style.borderColor = "rgba(200, 80, 60, 0.5)");
		setTimeout(() => {
			if (msgEl) msgEl.style.borderColor = "";
		}, 2000);
		return;
	}

	if (btnEl) btnEl.disabled = true;
	if (btnTxt) btnTxt.textContent = "Mengirim...";

	try {
		const { error } = await db.from("wishes").insert([
			{
				wedding_id: WEDDING_ID,
				name: nameEl.value.trim(),
				message: msgEl.value.trim(),
			},
		]);

		if (error) throw error;

		// Reset form
		nameEl.value = "";
		msgEl.value = "";
		document.getElementById("wishCounter") &&
			(document.getElementById("wishCounter").textContent = "0");

		if (btnTxt) btnTxt.textContent = "Terkirim! 🤍";
		setTimeout(() => {
			if (btnTxt) btnTxt.textContent = "Kirim Ucapan";
		}, 2500);
	} catch (err) {
		if (btnTxt) btnTxt.textContent = "Gagal, coba lagi";
		setTimeout(() => {
			if (btnTxt) btnTxt.textContent = "Kirim Ucapan";
		}, 2500);
	} finally {
		if (btnEl) btnEl.disabled = false;
	}
}

// ── Character counter & radio listener — dipasang saat DOM siap ──
// (sudah digabung ke DOMContentLoaded utama di bawah)
function initFormListeners() {
	// Character counter untuk textarea ucapan
	const msgEl = document.getElementById("wishMessage");
	const counterEl = document.getElementById("wishCounter");
	if (msgEl && counterEl) {
		msgEl.addEventListener("input", () => {
			counterEl.textContent = msgEl.value.length;
		});
	}

	// Hide guest count jika pilih tidak hadir
	document.querySelectorAll('input[name="attendance"]').forEach((radio) => {
		radio.addEventListener("change", () => {
			const group = document.getElementById("guestCountGroup");
			if (group) {
				group.style.display = radio.value === "hadir" ? "block" : "none";
			}
		});
	});
}

// ══════════════════════════════════════════════════════
// ── HELPER: Format waktu relatif
// ══════════════════════════════════════════════════════
function formatTimeAgo(isoString) {
	if (!isoString) return "";
	const date = new Date(isoString);
	const now = new Date();
	const diff = Math.floor((now - date) / 1000); // detik

	if (diff < 60) return "Baru saja";
	if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
	if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
	if (diff < 2592000) return `${Math.floor(diff / 86400)} hari lalu`;

	return date.toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

// ══════════════════════════════════════════════════════
// ── HELPER: Escape HTML untuk mencegah XSS
// ══════════════════════════════════════════════════════
function escapeHtml(str) {
	const div = document.createElement("div");
	div.appendChild(document.createTextNode(str));
	return div.innerHTML;
}
