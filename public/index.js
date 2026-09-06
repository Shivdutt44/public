// ========================================
// Responsive navigation
// ========================================
const mobile_nav = document.querySelector(".mobile-navbar-btn");
const nav_header = document.querySelector(".header");

const toggleNavbar = () => {
    // alert("hi");
    nav_header.classList.toggle("active");
};

mobile_nav.addEventListener("click", () => toggleNavbar());

// ========================================
// sticky navigation
// ========================================
const sectionHero = document.querySelector(".section-hero");

const observer = new IntersectionObserver(
    (entries) => {
        const ent = entries[0];
        console.log(ent);
        !ent.isIntersecting ?
            document.body.classList.add("sticky") :
            document.body.classList.remove("sticky");
    }, {
        // viewport
        root: null,
        threshold: 0,
        rootMargin: "-100px",
    }
);
// when the hero section end part reached then we need to show the sticky navigation
if (sectionHero) observer.observe(sectionHero);

// ========================================
//  how to add media queries in JS
// ========================================
function initTestimonialSwiper(widthSize) {
    if (!document.querySelector(".mySwiper")) return;
    if (widthSize.matches) {
        // If media query matches
        new Swiper(".mySwiper", {
            slidesPerView: 1,
            spaceBetween: 30,
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
            },
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
        });
    } else {
        new Swiper(".mySwiper", {
            slidesPerView: 2,
            spaceBetween: 30,
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
            },
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
        });
    }
}

const widthSize = window.matchMedia("(max-width: 780px)");
// Call listener function at run time
initTestimonialSwiper(widthSize);
// Attach listener function on state changes
widthSize.addListener(initTestimonialSwiper);

// ========================================
//  Bio Data Swiper (Single image slideshow)
// ========================================
function initBioSwiper() {
    if (!document.querySelector(".bioSwiper")) return;
    new Swiper(".bioSwiper", {
        slidesPerView: 1,
        spaceBetween: 0,
        autoplay: {
            delay: 3000,
            disableOnInteraction: false,
        },
        loop: true,
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
    });
}

initBioSwiper();

// ========================================
//  scroll to top
// ========================================
const scrollTopBtn = document.getElementById("scrollTopBtn");

// Show/hide the scroll-to-top button based on scroll position
window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
        if (scrollTopBtn) scrollTopBtn.style.display = "block";
    } else {
        if (scrollTopBtn) scrollTopBtn.style.display = "none";
    }
});

const scrollTop = () => {
    if (sectionHero) {
        sectionHero.scrollIntoView({ behavior: "smooth" });
    } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
};

const scrollTopAnchor = document.querySelector(".scroll-top");
if (scrollTopAnchor) {
    scrollTopAnchor.addEventListener("click", (e) => {
        e.preventDefault();
        scrollTop();
    });
}

// ========================================
//  Typing Animation
// ========================================
const typedRoleEl = document.getElementById("typed-role");

if (typedRoleEl) {
    const roles = [
        "Agentic AI Developer",
        "Shopify App Developer",
        "Shopify Theme Developer",
        "Full Stack Engineer",
        "AI Chatbot Builder"
    ];

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    const typeRole = () => {
        const currentRole = roles[roleIndex];

        if (!isDeleting) {
            typedRoleEl.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex === currentRole.length) {
                isDeleting = true;
                setTimeout(typeRole, 1800);
                return;
            }
            setTimeout(typeRole, 80);
        } else {
            typedRoleEl.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;

            if (charIndex === 0) {
                isDeleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                setTimeout(typeRole, 300);
                return;
            }
            setTimeout(typeRole, 40);
        }
    };

    setTimeout(typeRole, 500);
}

// get the data attributes

// ========================================
//  Resume Modal Open/Close
// ========================================
function openResumeModal() {
    const modal = document.getElementById("resumeModal");
    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
}

function closeResumeModal(event) {
    const modal = document.getElementById("resumeModal");
    if (!modal) return;
    // If event is from overlay click (event exists and target is overlay), close
    if (event && event.target !== modal) return;
    modal.classList.remove("active");
    document.body.style.overflow = "";
}

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const modal = document.getElementById("resumeModal");
        if (modal && modal.classList.contains("active")) {
            modal.classList.remove("active");
            document.body.style.overflow = "";
        }
    }
});

// ========================================
//  Dynamic Copyright Year
// ========================================
const yearSpan = document.getElementById("copyright-year");
if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
}

// ========================================
//  smooth scrolling
// ========================================

const portfolioSection = document.querySelector(".section-portfolio");

const portfolioLinkEl = document.querySelector(".portfolio-link");
if (portfolioLinkEl && portfolioSection) {
    portfolioLinkEl.addEventListener("click", (e) => {
        e.preventDefault();
        portfolioSection.scrollIntoView({ behavior: "smooth" });
    });
}

// Hire Me buttons now redirect to WhatsApp directly (via href in HTML)
// No JS needed — preventDefault would block the external link

// ========================================
// creating a portfolio tabbed component
// ========================================

const port_btn = document.querySelector(".p-btns");
const portfolio_grid = document.getElementById("portfolio-grid");

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function applyPortfolioFilter(btnNum) {
    if (!portfolio_grid) return;
    const num = String(btnNum);
    portfolio_grid.querySelectorAll(".img-ovelay").forEach((card) => {
        const cats = (card.dataset.categories || "").split(",");
        const show = num === "0" || cats.includes(num);
        card.classList.toggle("portfolio-image-not-active", !show);
    });
}

// Projects without a public listing to pull media from get a generated cover
// rather than a stock photo of somebody else's work.
function projectCover(title) {
    const palettes = [
        ["#4f46e5", "#7c3aed"],
        ["#2563eb", "#06b6d4"],
        ["#0f766e", "#14b8a6"],
        ["#d97706", "#f59e0b"],
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
    const [c1, c2] = palettes[Math.abs(hash) % palettes.length];
    const label = title.length > 28 ? title.slice(0, 27) + "…" : title;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
      <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
      </linearGradient></defs>
      <rect width="640" height="360" fill="url(#g)"/>
      <text x="320" y="188" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="700" fill="#ffffff" text-anchor="middle">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function renderPortfolio(projects) {
    if (!portfolio_grid) return;
    portfolio_grid.innerHTML = projects
        .map((p) => {
            const ext = p.external ? ' target="_blank" rel="noopener noreferrer"' : "";
            const cover = projectCover(p.title);
            const src = p.image ? escapeHtml(p.image) : cover;
            return `<div class="img-ovelay" data-categories="${p.categories.join(",")}">
          <img src="${src}" loading="lazy" alt="${escapeHtml(p.title)}" onerror="this.onerror=null;this.src='${cover}';" />
          <div class="overlay">
            <a href="${escapeHtml(p.link)}"${ext} class="common-heading">${escapeHtml(p.title)}</a>
          </div>
        </div>`;
        })
        .join("");

    const active = document.querySelector(".p-btn.p-btn-active");
    applyPortfolioFilter(active ? active.dataset.btnNum : "0");
}

if (port_btn) {
    port_btn.addEventListener("click", (e) => {
        const clicked = e.target.closest(".p-btn");
        if (!clicked) return;

        document
            .querySelectorAll(".p-btn")
            .forEach((btn) => btn.classList.remove("p-btn-active"));
        clicked.classList.add("p-btn-active");

        applyPortfolioFilter(clicked.dataset.btnNum);
    });
}

// Projects live in the database; the markup shipped in the HTML is only a
// fallback for when the API is unreachable.
if (portfolio_grid) {
    fetch("/api/projects")
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
        .then((data) => {
            if (data && Array.isArray(data.projects) && data.projects.length) {
                renderPortfolio(data.projects);
            }
        })
        .catch(() => {
            /* keep the server-rendered fallback grid */
        });
}

// ========================================
//  lazy loading section
// ========================================
const imgRef = document.querySelector("img[data-src]");

if (imgRef) {
    const lazyImg = (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        entry.target.src = imgRef.dataset.src;
    };

    const imgObserver = new IntersectionObserver(lazyImg, {
        root: null,
        threshold: 0,
    });

    imgObserver.observe(imgRef);
}

// ========================================
//  animated counter number
// ========================================

const workSection = document.querySelector(".section-work-data");

const workSectionObserve = (entries) => {
    const [entry] = entries;
    if (!entry.isIntersecting) return;

    const counterNum = document.querySelectorAll(".counter-numbers");
    const speed = 200;

    counterNum.forEach((curNumber) => {
        const targetNumber = parseInt(curNumber.dataset.number);
        let current = 0;
        const incrementNumber = Math.max(1, Math.trunc(targetNumber / speed));
        const updateNumber = () => {
            current += incrementNumber;
            if (current < targetNumber) {
                curNumber.innerText = `${current}+`;
                setTimeout(updateNumber, 10);
            } else {
                curNumber.innerText = `${targetNumber}+`;
            }
        };
        curNumber.innerText = "0";
        updateNumber();
    });
};

if (workSection) {
    const workSecObserver = new IntersectionObserver(workSectionObserve, {
        root: null,
        threshold: 0,
    });

    workSecObserver.observe(workSection);
}