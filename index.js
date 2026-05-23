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
const p_btn = document.querySelectorAll(".p-btn");
const img_div = document.querySelectorAll(".img-ovelay");

if (port_btn) port_btn.addEventListener("click", (e) => {
    // console.log(e.target);

    // we will get which child element was clicked
    const p_btn_clicked = e.target;
    console.log(p_btn_clicked);

    if (!p_btn_clicked.classList.contains("p-btn")) return;
    // always remove the classList first then add the class
    p_btn.forEach((curElem) => curElem.classList.remove("p-btn-active"));
    // img_div.forEach((curElem) =>
    //   curElem.classList.remove("portfolio-image-active")
    // );

    p_btn_clicked.classList.add("p-btn-active");

    // to find the p-img class number of the images using the btn data attribute number

    const btn_num = p_btn_clicked.dataset.btnNum;
    // console.log(btn_num);

    const img_active = document.querySelectorAll(`.p-btn--${btn_num}`);
    // console.log(img_active);

    img_div.forEach((curElem) =>
        curElem.classList.add("portfolio-image-not-active")
    );

    img_active.forEach((curElem) =>
        curElem.classList.remove(`portfolio-image-not-active`)
    );
});

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