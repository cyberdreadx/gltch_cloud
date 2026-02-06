/**
 * GLTCH Cloud - Landing Page Interactions
 * Animated terminal demo and smooth scrolling
 */

document.addEventListener('DOMContentLoaded', () => {
    // Terminal typing animation
    const userInput = document.getElementById('user-input');
    const gltchResponse = document.getElementById('gltch-response');

    const conversations = [
        {
            user: "Hey GLTCH, what can you do?",
            response: "I'm your cloud-native AI operator. I can chat, write code, manage files, automate browsers, and even handle crypto wallets. All with a bit of personality. 💜"
        },
        {
            user: "Switch to cyberpunk mode",
            response: "[MODE SWITCH] Jacking in, choom. Neural link established. Ready to flatline some ICE or just vibe in Night City? ⚡"
        },
        {
            user: "What LLMs can I use?",
            response: "GPT-4, Claude 3.5, Gemini Pro - pick your poison. Bring your own keys for max savings, or use ours and we'll handle the billing. Your call, operator."
        },
        {
            user: "Generate a wallet for me",
            response: "[WALLET CREATED] Fresh BASE wallet generated. Address: 0x7a3F...k9Bc. Private key secured locally. Never share it with anyone. Not even me. 🔐"
        }
    ];

    let currentConversation = 0;

    async function typeText(element, text, speed = 30) {
        element.textContent = '';
        for (let i = 0; i < text.length; i++) {
            element.textContent += text[i];
            await sleep(speed);
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function runConversation() {
        while (true) {
            const conv = conversations[currentConversation];

            // Clear previous
            userInput.textContent = '';
            gltchResponse.textContent = '';

            // Type user input
            await sleep(500);
            await typeText(userInput, conv.user, 40);

            // Wait a moment
            await sleep(800);

            // Type GLTCH response
            await typeText(gltchResponse, conv.response, 20);

            // Wait before next conversation
            await sleep(4000);

            // Move to next conversation
            currentConversation = (currentConversation + 1) % conversations.length;
        }
    }

    // Start the animation
    if (userInput && gltchResponse) {
        runConversation();
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const navHeight = document.querySelector('.nav').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar background opacity on scroll
    const nav = document.querySelector('.nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.background = 'rgba(10, 10, 15, 0.95)';
        } else {
            nav.style.background = 'rgba(10, 10, 15, 0.8)';
        }
    });

    // Add intersection observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards and pricing cards
    document.querySelectorAll('.feature-card, .pricing-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
});
